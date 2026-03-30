const { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain, nativeImage, shell } = require('electron');
const path = require('path');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const kill = require('tree-kill');

// ── Configuration & State ─────────────────────────────────────────────────────
const IS_DEV = !app.isPackaged;
const NODE_PORT = 5000;
const PYTHON_PORT = 8000;

let mainWindow = null;
let tray = null;
let nodeProcess = null;
let pythonProcess = null;
let logStream = null;

// ── Path Resolution Helper ───────────────────────────────────────────────────
function getUnpackedPath(relPath) {
    if (IS_DEV) return path.join(app.getAppPath(), relPath);
    return path.join(process.resourcesPath, 'app.asar.unpacked', relPath);
}

function getLogDir() {
    const logDir = path.join(app.getPath('userData'), 'logs');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    return logDir;
}

function initLogging() {
    const logPath = path.join(getLogDir(), 'backend.log');
    logStream = fs.createWriteStream(logPath, { flags: 'a' });
    const timestamp = new Date().toISOString();
    logStream.write(`\n\n--- Session Start: ${timestamp} ---\n`);
}

// ── Service Orchestration ─────────────────────────────────────────────────────
function findPython() {
    const commands = ['python', 'python3', 'py'];
    for (const cmd of commands) {
        try {
            execSync(`${cmd} --version`, { stdio: 'ignore' });
            return cmd;
        } catch (e) {}
    }
    return null;
}

async function killExistingOnPort(port) {
    try {
        console.log(`[Main] Clearing port ${port}...`);
        const script = `Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }`;
        execSync(`powershell -Command "${script}"`, { stdio: 'ignore' });
    } catch (e) {}
}

async function spawnServices() {
    await killExistingOnPort(NODE_PORT);
    await killExistingOnPort(PYTHON_PORT);

    const controllerPath = getUnpackedPath('edith/controller/server.js');
    const aiPath = getUnpackedPath('edith/ai_engine/ai.py');
    const pythonExe = findPython() || 'python';

    console.log(`[Main] Spawning Node at: ${controllerPath}`);
    nodeProcess = spawn(process.execPath, [controllerPath], { 
        cwd: getUnpackedPath('.'), 
        env: { ...process.env, NODE_PORT } 
    });

    console.log(`[Main] Spawning Python (${pythonExe}) at: ${aiPath}`);
    pythonProcess = spawn(pythonExe, [aiPath], { 
        cwd: getUnpackedPath('.'),
        env: { ...process.env, PYTHON_PORT }
    });

    // Pipe outputs to centralized log
    [nodeProcess, pythonProcess].forEach((proc, idx) => {
        if (!proc) return;
        const name = idx === 0 ? 'NODE' : 'PYTHON';
        proc.stdout.on('data', (data) => logStream.write(`[${name}_STDOUT] ${data}`));
        proc.stderr.on('data', (data) => logStream.write(`[${name}_STDERR] ${data}`));
        proc.on('close', (code) => {
            console.warn(`[Main] ${name} process exited with code ${code}`);
            logStream.write(`[${name}_EXIT] Process closed with code ${code}\n`);
        });
    });
}

// ── Window & Tray Management ──────────────────────────────────────────────────
function createTray() {
    const iconPath = getUnpackedPath('assets/tray_icon.png');
    const trayIcon = nativeImage.createFromPath(iconPath);
    tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));
    
    const contextMenu = Menu.buildFromTemplate([
        { label: 'EDITH AI', enabled: false },
        { type: 'separator' },
        { label: 'Open Interface', click: () => { mainWindow.show(); mainWindow.focus(); } },
        { label: 'View Logs', click: () => shell.openPath(getLogDir()) },
        { type: 'separator' },
        { label: 'Restart Services', click: () => spawnServices() },
        { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } }
    ]);

    tray.setToolTip('EDITH AI Agent');
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => { mainWindow.show(); mainWindow.focus(); });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1050, height: 850, frame: false, backgroundColor: '#05070a',
        show: false, // Don't show until ready-to-show
        webPreferences: { 
            preload: path.join(__dirname, 'preload.js'), 
            contextIsolation: true, 
            nodeIntegration: false, 
            sandbox: true 
        }
    });

    const frontendPath = getUnpackedPath('edith/frontend/index.html');
    mainWindow.loadFile(frontendPath);

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
        return false;
    });
}

// ── IPC Listeners ─────────────────────────────────────────────────────────────
function initIPC() {
    ipcMain.on('hide-window', () => mainWindow.hide());
    ipcMain.on('minimize-window', () => mainWindow.minimize());
    ipcMain.on('maximize-window', () => {
        if (mainWindow.isMaximized()) mainWindow.unmaximize();
        else mainWindow.maximize();
    });
    ipcMain.on('close-window', () => mainWindow.hide()); // Hide to tray instead of quitting

    ipcMain.handle('get-version', () => app.getVersion());
    ipcMain.handle('check-health', async () => {
        return new Promise((r) => {
            const req = http.get(`http://localhost:${NODE_PORT}/api/status`, (res) => r(res.statusCode === 200));
            req.on('error', () => r(false));
            req.end();
        });
    });
}

// ── App Lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
    initLogging();
    await spawnServices();
    initIPC();
    createTray();
    createWindow();
});

function cleanup() {
    if (nodeProcess) kill(nodeProcess.pid);
    if (pythonProcess) kill(pythonProcess.pid);
}

app.on('before-quit', () => {
    app.isQuitting = true;
    cleanup();
});

// Catastrophic error handling
process.on('uncaughtException', (err) => {
    console.error('[Main] Uncaught Exception:', err);
    cleanup();
    app.quit();
});
