const { app, BrowserWindow, Menu, ipcMain, dialog, screen, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const { spawn } = require('child_process');

const ICON_PATH = path.join(__dirname, 'edith.png');
const BACKEND_URL = 'http://127.0.0.1:8001';
const BACKEND_HEALTH_PATH = '/health';
const BACKEND_MAX_WAIT_MS = 60000;  // 60 seconds max wait
const BACKEND_POLL_INTERVAL_MS = 1000; // Poll every 1 second

let terminalSession = null;
let mainWindow = null;
let splashWindow = null;

// Determine workspace root dynamically
const isPackaged = app.isPackaged;
// workspacePath is null until user opens a folder
let workspacePath = null;

// Backend is always relative to the app itself (not the user workspace)
const appRoot = (isPackaged
  ? path.resolve(path.dirname(app.getPath('exe')), '..')
  : path.resolve(__dirname, '..')).replace(/\\/g, '/');
const backendPath = path.join(appRoot, 'backend');

/**
 * waitForBackend — polls the backend health endpoint until it responds.
 * Electron does NOT start the backend; the backend must be started externally
 * (e.g., via edith-backend.exe, the Windows Service, or run manually in dev).
 *
 * @param {Function} onStatusUpdate  called with a status string on each poll
 * @returns {Promise<boolean>}       resolves true when backend is ready, false on timeout
 */
function waitForBackend(onStatusUpdate) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let attempt = 0;

    function poll() {
      attempt++;
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const msg = `Connecting to EDITH backend... (${elapsed}s)`;
      console.log(`[Main] ${msg}`);
      if (onStatusUpdate) onStatusUpdate(msg);

      const req = http.get(`${BACKEND_URL}${BACKEND_HEALTH_PATH}`, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 500) {
          console.log('[Main] Backend is ready!');
          if (onStatusUpdate) onStatusUpdate('Backend ready!');
          resolve(true);
        } else {
          scheduleNextPoll();
        }
      });

      req.on('error', () => {
        // Backend not up yet — keep polling
        scheduleNextPoll();
      });

      req.setTimeout(900, () => {
        req.destroy();
        scheduleNextPoll();
      });
    }

    function scheduleNextPoll() {
      if (Date.now() - startTime >= BACKEND_MAX_WAIT_MS) {
        console.warn('[Main] Backend did not start within timeout. Proceeding anyway.');
        if (onStatusUpdate) onStatusUpdate('Backend not detected. Starting in offline mode.');
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

  // Use workspacePath if open, else fall back to user home dir
  const termCwd = workspacePath || app.getPath('home');
  console.log(`[Main] Initializing live terminal session in: ${termCwd}`);

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

// ── IPC Handlers for Real-Time File System & Terminal ─────────────────────

ipcMain.handle('workspace:get-path', () => {
  return workspacePath; // null if no folder is open
});

ipcMain.handle('workspace:select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, path: workspacePath };
  }
  workspacePath = result.filePaths[0].replace(/\\/g, '/');

  // Re-spawn terminal session in newly selected active directory
  initTerminal(mainWindow.webContents);

  return { success: true, path: workspacePath };
});

ipcMain.handle('workspace:close-folder', async () => {
  workspacePath = null; // No folder open

  // Re-spawn terminal session at home dir
  initTerminal(mainWindow.webContents);

  return { success: true, path: null };
});

ipcMain.handle('fs:read-dir', () => {
  if (!workspacePath) return []; // No folder open
  return readDirRecursive(workspacePath, workspacePath);
});

ipcMain.handle('fs:create-folder', async (event, relPath) => {
  if (!workspacePath) throw new Error('No workspace folder is open');
  const absPath = path.isAbsolute(relPath) ? relPath : path.join(workspacePath, relPath);
  try {
    fs.mkdirSync(absPath, { recursive: true });
    const relativePath = path.relative(workspacePath, absPath).replace(/\\/g, '/');
    return { success: true, path: relativePath, absPath };
  } catch (err) {
    console.error(`Error creating folder ${absPath}:`, err);
    throw err;
  }
});

ipcMain.handle('fs:read-file', async (event, relPath) => {
  if (!workspacePath && !path.isAbsolute(relPath)) throw new Error('No workspace folder is open');
  const absPath = path.isAbsolute(relPath) ? relPath : path.join(workspacePath, relPath);
  try {
    return fs.readFileSync(absPath, 'utf8');
  } catch (err) {
    console.error(`Error reading file ${absPath}:`, err);
    throw err;
  }
});

ipcMain.handle('fs:write-file', async (event, { relPath, content }) => {
  if (!workspacePath && !path.isAbsolute(relPath)) throw new Error('No workspace folder is open');
  const absPath = path.isAbsolute(relPath) ? relPath : path.join(workspacePath, relPath);
  try {
    fs.writeFileSync(absPath, content, 'utf8');
    return { success: true };
  } catch (err) {
    console.error(`Error writing file ${absPath}:`, err);
    throw err;
  }
});

ipcMain.handle('fs:create-file', async (event, relPath) => {
  if (!workspacePath && !path.isAbsolute(relPath)) throw new Error('No workspace folder is open');
  const absPath = path.isAbsolute(relPath) ? relPath : path.join(workspacePath, relPath);
  try {
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, '', 'utf8');
    // Return both absPath and path (relative) for compatibility
    const relativePath = workspacePath ? path.relative(workspacePath, absPath).replace(/\\/g, '/') : absPath;
    return { success: true, path: relativePath, absPath };
  } catch (err) {
    console.error(`Error creating file ${absPath}:`, err);
    throw err;
  }
});

ipcMain.handle('fs:delete', async (event, relPath) => {
  if (!workspacePath && !path.isAbsolute(relPath)) throw new Error('No workspace folder is open');
  const absPath = path.isAbsolute(relPath) ? relPath : path.join(workspacePath, relPath);
  try {
    const stat = fs.statSync(absPath);
    if (stat.isDirectory()) {
      // Delete directory recursively
      fs.rmSync(absPath, { recursive: true, force: true });
    } else {
      // Delete file
      fs.unlinkSync(absPath);
    }
    return { success: true, path: relPath };
  } catch (err) {
    console.error(`Error deleting ${absPath}:`, err);
    throw err;
  }
});

ipcMain.on('terminal:write', (event, data) => {
  if (terminalSession && terminalSession.stdin) {
    terminalSession.stdin.write(data);
  }
});

// Zoom IPC handlers — scale the entire BrowserWindow webContents
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

function sendWindowState() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const state = mainWindow.isMaximized() ? 'maximized' : 'normal';
    mainWindow.webContents.send('window:state-changed', state);
  }
}

ipcMain.handle('window:is-maximized', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow.isMaximized();
  }
  return false;
});

// Window control IPC handlers
ipcMain.on('window:minimize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.minimize();
  }
});

ipcMain.on('window:maximize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window:close', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }
});

// Run File IPC — spawns the file in a child process, streams stdout/stderr live
let runProcess = null;

ipcMain.handle('run:file', (event, { command, args, cwd, filePath }) => {
  // Kill any existing run process
  if (runProcess) {
    try { runProcess.kill('SIGTERM'); } catch (e) { }
    runProcess = null;
  }

  // Determine working directory
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

// Open file in external application (browser for HTML)
ipcMain.handle('file:open-external', async (event, filePath) => {
  try {
    // Resolve to absolute path if needed
    let absolutePath = filePath;
    if (!path.isAbsolute(filePath)) {
      absolutePath = path.join(workspacePath || process.cwd(), filePath);
    }
    
    // Ensure the file exists
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found: ${absolutePath}`);
    }
    
    // Convert to file:// URL for proper browser opening
    const fileUrl = `file://${absolutePath.replace(/\\/g, '/')}`;
    
    console.log(`Opening in browser: ${fileUrl}`);
    await shell.openExternal(fileUrl);
    
    return { success: true, path: absolutePath };
  } catch (error) {
    console.error('Failed to open file:', error);
    return { success: false, error: error.message };
  }
});

// System Info IPC handler — returns live CPU, RAM, uptime, platform
ipcMain.handle('system:info', async () => {
  // CPU usage: sample over 200ms delta
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

// Recursive Directory Reader helper
function readDirRecursive(dirPath, rootDir) {
  let results = [];
  try {
    const list = fs.readdirSync(dirPath);
    list.forEach(file => {
      const fullPath = path.join(dirPath, file);
      const stat = fs.statSync(fullPath);
      const relativePath = path.relative(rootDir, fullPath).replace(/\\/g, '/');

      // Ignore builds, node_modules, temp and git folders to keep file tree clean
      const ignoreDirs = ['node_modules', '.git', '__pycache__', 'dist', 'dist-installer', 'build_temp', 'build', '.gemini', 'mobile-app'];
      if (ignoreDirs.includes(file)) {
        return;
      }

      if (stat && stat.isDirectory()) {
        results.push({
          name: file,
          path: relativePath,
          isDir: true,
          children: readDirRecursive(fullPath, rootDir)
        });
      } else {
        results.push({
          name: file,
          path: relativePath,
          isDir: false
        });
      }
    });
  } catch (err) {
    console.error(`Error listing folder ${dirPath}:`, err);
  }

  // Sort folders first, then files alphabetically
  return results.sort((a, b) => {
    if (a.isDir && !b.isDir) return -1;
    if (!a.isDir && b.isDir) return 1;
    return a.name.localeCompare(b.name);
  });
}

// Remove standard native menu bar
Menu.setApplicationMenu(null);

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

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 950,
    minHeight: 650,
    show: false,
    frame: false,
    icon: ICON_PATH,
    title: 'EDITH',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('maximize', sendWindowState);
  mainWindow.on('unmaximize', sendWindowState);
  mainWindow.on('restore', sendWindowState);
  mainWindow.webContents.on('did-finish-load', sendWindowState);

  mainWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
    }
    mainWindow.show();

    // Spawn live terminal Session
    initTerminal(mainWindow.webContents);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  createSplashWindow();

  // Wait for the backend to become available (started externally)
  const backendReady = await waitForBackend((statusMsg) => {
    // Forward status updates to the splash window if it's still open
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.webContents.executeJavaScript(
        `document.getElementById('splash-status') && (document.getElementById('splash-status').textContent = ${JSON.stringify(statusMsg)})`
      ).catch(() => { });
    }
  });

  // Signal splash to snap to 100% before opening main window
  if (backendReady && splashWindow && !splashWindow.isDestroyed()) {
    await splashWindow.webContents.executeJavaScript(
      `typeof window.__splashDone === 'function' && window.__splashDone()`
    ).catch(() => { });
    // Short pause so the user sees "Backend ready!" at 100%
    await new Promise(r => setTimeout(r, 600));
  }

  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Kill the local terminal session only — Electron does NOT own the backend process
  if (terminalSession) {
    try {
      terminalSession.kill();
    } catch (e) { }
  }
  // NOTE: The backend (edith-backend.exe / Windows Service) is intentionally NOT killed here.
  // It is managed externally and should continue running after the UI is closed.
});
