const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const https = require('https');
const { spawn } = require('child_process');

const ICON_PATH = path.join(__dirname, 'edith.png');
const BACKEND_URL = 'http://127.0.0.1:8001';
const BACKEND_HEALTH_PATH = '/health';
const BACKEND_MAX_WAIT_MS = 60000;  // 60 seconds max wait
const BACKEND_POLL_INTERVAL_MS = 1000; // Poll every 1 second

let mainWindow = null;
let splashWindow = null;
let terminalSession = null;
let runProcess = null;

const isDev = process.argv.includes('--dev');

// Determine workspace root dynamically
const isPackaged = app.isPackaged;
let workspacePath = null;

const appRoot = (isPackaged
  ? path.resolve(path.dirname(app.getPath('exe')), '..')
  : path.resolve(__dirname, '..')).replace(/\\/g, '/');
const backendPath = path.join(appRoot, 'backend');

/**
 * waitForBackend — polls the backend health endpoint until it responds.
 */
function waitForBackend(onStatusUpdate) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let done = false;

    function poll() {
      if (done) return;
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const msg = `Connecting to EDITH backend... (${elapsed}s)`;
      console.log(`[Main] ${msg}`);
      if (onStatusUpdate) onStatusUpdate(msg);

      let pollDone = false;

      const req = http.get(`${BACKEND_URL}${BACKEND_HEALTH_PATH}`, (res) => {
        // Consume response to free socket
        res.resume();
        if (pollDone) return;
        pollDone = true;
        if (res.statusCode >= 200 && res.statusCode < 500) {
          console.log('[Main] Backend is ready!');
          if (onStatusUpdate) onStatusUpdate('Backend ready!');
          done = true;
          resolve(true);
        } else {
          scheduleNextPoll();
        }
      });

      req.on('error', () => {
        if (pollDone) return;
        pollDone = true;
        scheduleNextPoll();
      });

      req.setTimeout(900, () => {
        if (pollDone) return;
        pollDone = true;
        req.destroy();
        scheduleNextPoll();
      });
    }

    function scheduleNextPoll() {
      if (done) return;
      if (Date.now() - startTime >= BACKEND_MAX_WAIT_MS) {
        console.warn('[Main] Backend did not start within timeout. Proceeding anyway.');
        if (onStatusUpdate) onStatusUpdate('Backend not detected. Starting in offline mode.');
        done = true;
        resolve(false);
      } else {
        setTimeout(poll, BACKEND_POLL_INTERVAL_MS);
      }
    }

    poll();
  });
}

function initTerminal(webContents) {
  if (terminalSession) {
    try {
      terminalSession.kill();
    } catch (e) { }
  }

  const termCwd = workspacePath || app.getPath('home');
  console.log(`[Main] Initializing terminal session in: ${termCwd}`);

  if (process.platform === 'win32') {
    terminalSession = spawn('powershell.exe', ['-NoLogo', '-ExecutionPolicy', 'Bypass'], {
      cwd: termCwd,
      env: { ...process.env, TERM: 'xterm-256color' }
    });
  } else {
    terminalSession = spawn('bash', [], {
      cwd: termCwd,
      env: { ...process.env, TERM: 'xterm-256color' }
    });
  }

  terminalSession.stdout.on('data', (data) => {
    if (mainWindow) mainWindow.webContents.send('terminal:data', data.toString());
  });

  terminalSession.stderr.on('data', (data) => {
    if (mainWindow) mainWindow.webContents.send('terminal:data', data.toString());
  });

  terminalSession.on('close', (code) => {
    if (mainWindow) mainWindow.webContents.send('terminal:data', `\r\nShell process exited with code ${code}\r\n`);
  });
}

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 420,
    height: 420,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    center: true,
    icon: ICON_PATH,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  splashWindow.loadFile(path.join(__dirname, 'renderer', 'splash.html'));

  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    show: false,
    backgroundColor: '#1e1e2e',
    icon: ICON_PATH,
    title: 'EDITH',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      spellcheck: false,
    },
  });

  // Start in chatbot mode (Normal Mode)
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'chatbot.html'));

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer] ${message} (at ${path.basename(sourceId)}:${line})`);
  });

  mainWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
    }
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
    initTerminal(mainWindow.webContents);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximized', true);
  });
  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-maximized', false);
  });
  mainWindow.on('focus', () => {
    mainWindow.webContents.send('window-focus', true);
  });
  mainWindow.on('blur', () => {
    mainWindow.webContents.send('window-focus', false);
  });

  buildMenu();
}

function buildMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'New File', accelerator: 'CmdOrCtrl+N', click: () => mainWindow.webContents.send('menu-action', 'new-file') },
        { label: 'Open File...', accelerator: 'CmdOrCtrl+O', click: () => mainWindow.webContents.send('menu-action', 'open-file') },
        { label: 'Open Folder...', accelerator: 'CmdOrCtrl+Shift+O', click: () => mainWindow.webContents.send('menu-action', 'open-folder') },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => mainWindow.webContents.send('menu-action', 'save') },
        { label: 'Save As...', accelerator: 'CmdOrCtrl+Shift+S', click: () => mainWindow.webContents.send('menu-action', 'save-as') },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'CmdOrCtrl+Q', role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        { label: 'Find', accelerator: 'CmdOrCtrl+F', click: () => mainWindow.webContents.send('menu-action', 'find') },
        { label: 'Replace', accelerator: 'CmdOrCtrl+H', click: () => mainWindow.webContents.send('menu-action', 'replace') },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Toggle Sidebar', accelerator: 'CmdOrCtrl+B', click: () => mainWindow.webContents.send('menu-action', 'toggle-sidebar') },
        { label: 'Toggle Terminal', accelerator: 'Ctrl+`', click: () => mainWindow.webContents.send('menu-action', 'toggle-terminal') },
        { type: 'separator' },
        { label: 'Zoom In',  accelerator: 'CmdOrCtrl+=', click: () => {
          if (mainWindow) {
            const f = mainWindow.webContents.getZoomFactor();
            mainWindow.webContents.setZoomFactor(Math.min(2.0, Math.round((f + 0.1) * 10) / 10));
          }
        }},
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', click: () => {
          if (mainWindow) {
            const f = mainWindow.webContents.getZoomFactor();
            mainWindow.webContents.setZoomFactor(Math.max(0.5, Math.round((f - 0.1) * 10) / 10));
          }
        }},
        { label: 'Reset Zoom', accelerator: 'CmdOrCtrl+0', click: () => {
          if (mainWindow) mainWindow.webContents.setZoomFactor(1.0);
        }},
        { type: 'separator' },
        { label: 'Toggle Dev Tools', accelerator: 'F12', click: () => mainWindow.webContents.toggleDevTools() },
      ],
    },
    {
      label: 'Help',
      submenu: [
        { label: 'About EDITH', click: () => mainWindow.webContents.send('menu-action', 'about') },
        { label: 'Documentation', click: () => shell.openExternal('https://github.com') },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ─── IPC Handlers ────────────────────────────────────────────────────────────

// Window controls
ipcMain.on('window-minimize', () => mainWindow && mainWindow.minimize());
ipcMain.on('window-maximize-toggle', () => {
  if (!mainWindow) return;
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});
ipcMain.on('window-close', () => mainWindow && mainWindow.close());

ipcMain.handle('window:is-maximized', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow.isMaximized();
  }
  return false;
});

// Workspace
ipcMain.handle('workspace:get-path', () => workspacePath);

ipcMain.handle('workspace:select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, path: workspacePath };
  }
  workspacePath = result.filePaths[0].replace(/\\/g, '/');
  initTerminal(mainWindow.webContents);
  return { success: true, path: workspacePath };
});

ipcMain.handle('workspace:close-folder', async () => {
  workspacePath = null;
  initTerminal(mainWindow.webContents);
  return { success: true, path: null };
});

// File system operations
ipcMain.handle('open-folder-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
  });
  return result.canceled ? [] : result.filePaths;
});

ipcMain.handle('save-file-dialog', async (event, defaultPath) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultPath || 'untitled.txt',
  });
  return result.canceled ? null : result.filePath;
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return { success: true, content };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('write-file', async (event, filePath, content) => {
  try {
    fs.writeFileSync(filePath, content, 'utf8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('read-directory', async (event, dirPath) => {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    return {
      success: true,
      entries: entries.map((e) => ({
        name: e.name,
        isDirectory: e.isDirectory(),
        path: path.join(dirPath, e.name),
      })).sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      }),
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('create-file', async (event, filePath) => {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, '', 'utf8');
    const relativePath = workspacePath ? path.relative(workspacePath, filePath).replace(/\\/g, '/') : filePath;
    return { success: true, path: relativePath, absPath: filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('create-directory', async (event, dirPath) => {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('rename-path', async (event, oldPath, newPath) => {
  try {
    fs.renameSync(oldPath, newPath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('delete-path', async (event, targetPath) => {
  try {
    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) {
      fs.rmSync(targetPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(targetPath);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('path-exists', async (event, targetPath) => {
  return fs.existsSync(targetPath);
});

ipcMain.handle('get-home-dir', async () => os.homedir());

ipcMain.handle('get-path-sep', async () => path.sep);

ipcMain.handle('join-paths', async (event, ...parts) => path.join(...parts));

ipcMain.handle('basename', async (event, filePath) => path.basename(filePath));

ipcMain.handle('dirname', async (event, filePath) => path.dirname(filePath));

ipcMain.handle('show-confirm-dialog', async (event, options) => {
  const result = await dialog.showMessageBox(mainWindow, {
    type: options.type || 'question',
    buttons: options.buttons || ['Yes', 'No'],
    defaultId: options.defaultId || 0,
    title: options.title || 'Confirm',
    message: options.message || 'Are you sure?',
    detail: options.detail || '',
  });
  return result.response;
});

// Terminal
ipcMain.on('terminal:write', (event, data) => {
  if (terminalSession && terminalSession.stdin) {
    terminalSession.stdin.write(data);
  }
});

// Run File
ipcMain.handle('run:file', (event, { command, args, cwd, filePath }) => {
  if (runProcess) {
    try { runProcess.kill('SIGTERM'); } catch (e) { }
    runProcess = null;
  }

  let workDir = cwd;
  if (!workDir && filePath) {
    workDir = path.dirname(filePath.replace(/\//g, path.sep));
  }
  if (!workDir) {
    workDir = workspacePath || process.cwd();
  }

  console.log(`Running: ${command} ${(args || []).join(' ')} in ${workDir}`);

  try {
    runProcess = spawn(command, args || [], {
      cwd: workDir,
      shell: true,
      env: { ...process.env }
    });

    runProcess.stdout.on('data', (data) => {
      if (mainWindow) mainWindow.webContents.send('run:output', { type: 'stdout', data: data.toString() });
    });

    runProcess.stderr.on('data', (data) => {
      if (mainWindow) mainWindow.webContents.send('run:output', { type: 'stderr', data: data.toString() });
    });

    runProcess.on('close', (code) => {
      if (mainWindow) mainWindow.webContents.send('run:output', { type: 'exit', code });
      runProcess = null;
    });

    runProcess.on('error', (err) => {
      if (mainWindow) mainWindow.webContents.send('run:output', { type: 'error', message: err.message });
      runProcess = null;
    });

    return { started: true };
  } catch (error) {
    console.error('Failed to start process:', error);
    return { started: false, error: error.message };
  }
});

ipcMain.handle('run:kill', () => {
  if (runProcess) {
    try { 
      runProcess.kill('SIGTERM'); 
      runProcess = null;
      return { killed: true };
    } catch (e) { 
      return { killed: false, error: e.message };
    }
  }
  return { killed: false, message: 'No process running' };
});

ipcMain.handle('file:open-external', async (event, filePath) => {
  try {
    let absolutePath = filePath;
    if (!path.isAbsolute(filePath)) {
      absolutePath = path.join(workspacePath || process.cwd(), filePath);
    }
    
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found: ${absolutePath}`);
    }
    
    const fileUrl = `file://${absolutePath.replace(/\\/g, '/')}`;
    console.log(`Opening in browser: ${fileUrl}`);
    await shell.openExternal(fileUrl);
    
    return { success: true, path: absolutePath };
  } catch (error) {
    console.error('Failed to open file:', error);
    return { success: false, error: error.message };
  }
});

// Zoom handlers
ipcMain.handle('zoom:get', () => {
  if (mainWindow) return mainWindow.webContents.getZoomFactor();
  return 1.0;
});

ipcMain.handle('zoom:set', (event, factor) => {
  if (mainWindow) {
    const clamped = Math.max(0.5, Math.min(2.0, factor));
    mainWindow.webContents.setZoomFactor(clamped);
    return clamped;
  }
  return 1.0;
});

// Open VSX API proxy — bypasses CORS restriction on file:// origin
ipcMain.handle('openvsx:fetch', (event, url) => {
  return new Promise((resolve, reject) => {
    // Only allow requests to Open VSX
    if (!url.startsWith('https://open-vsx.org/')) {
      reject(new Error('URL not allowed: ' + url));
      return;
    }
    const req = https.get(url, {
      headers: {
        'User-Agent': 'EDITH-IDE/1.0',
        'Accept': 'application/json',
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ ok: true, status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ ok: false, status: res.statusCode, error: 'JSON parse error: ' + e.message });
        }
      });
    });
    req.on('error', (err) => {
      resolve({ ok: false, status: 0, error: err.message });
    });
    req.setTimeout(10000, () => {
      req.destroy();
      resolve({ ok: false, status: 0, error: 'Request timed out' });
    });
  });
});

// Navigation between modes
ipcMain.handle('navigation:load-agent-mode', async () => {
  if (!mainWindow) return { success: false };
  try {
    await mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
    initTerminal(mainWindow.webContents);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('navigation:load-normal-mode', async () => {
  if (!mainWindow) return { success: false };
  try {
    await mainWindow.loadFile(path.join(__dirname, 'renderer', 'chatbot.html'));
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// System info
ipcMain.handle('system:info', async () => {
  function getCpuUsage() {
    return new Promise((resolve) => {
      const cpus1 = os.cpus();
      setTimeout(() => {
        const cpus2 = os.cpus();
        let totalIdle = 0, totalTick = 0;
        cpus1.forEach((cpu, i) => {
          const cpu2 = cpus2[i];
          for (const type in cpu2.times) {
            totalTick += cpu2.times[type] - cpu.times[type];
          }
          totalIdle += cpu2.times.idle - cpu.times.idle;
        });
        const usage = 100 - Math.floor((totalIdle / totalTick) * 100);
        resolve(Math.max(0, Math.min(100, usage)));
      }, 200);
    });
  }

  const cpuUsage = await getCpuUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memPct = Math.round((usedMem / totalMem) * 100);
  const uptimeSec = os.uptime();
  const hours = Math.floor(uptimeSec / 3600);
  const mins = Math.floor((uptimeSec % 3600) / 60);
  const cpuModel = os.cpus()[0] ? os.cpus()[0].model.split('@')[0].trim() : 'Unknown CPU';
  const platform = process.platform === 'win32' ? 'Windows' : (process.platform === 'darwin' ? 'macOS' : 'Linux');
  const arch = os.arch();
  const hostname = os.hostname();

  return {
    cpuUsage,
    cpuModel,
    cpuCores: os.cpus().length,
    totalMemGB: (totalMem / 1073741824).toFixed(1),
    usedMemGB: (usedMem / 1073741824).toFixed(1),
    memPct,
    uptime: `${hours}h ${mins}m`,
    platform,
    arch,
    hostname,
    nodeVersion: process.versions.node,
    electronVersion: process.versions.electron
  };
});

// ─── App lifecycle ───────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  createSplashWindow();

  const backendReady = await waitForBackend((statusMsg) => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.webContents.executeJavaScript(
        `document.getElementById('splash-status') && (document.getElementById('splash-status').textContent = ${JSON.stringify(statusMsg)})`
      ).catch(() => { });
    }
  });

  if (backendReady && splashWindow && !splashWindow.isDestroyed()) {
    await splashWindow.webContents.executeJavaScript(
      `typeof window.__splashDone === 'function' && window.__splashDone()`
    ).catch(() => { });
    await new Promise(r => setTimeout(r, 600));
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (terminalSession) {
    try {
      terminalSession.kill();
    } catch (e) { }
  }
  if (runProcess) {
    try {
      runProcess.kill();
    } catch (e) { }
  }
});
