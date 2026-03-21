/**
 * EDITH Electron Main Process (V41.0) — Production Spawning Overhaul
 * ──────────────────────────────────────────────────────────────────
 * This version implements a strictly controlled 'spawn' strategy:
 *   1. Replaces utilityProcess with child_process.spawn("node", ...).
 *   2. Resolves scripts to 'app.asar.unpacked' via getUnpackedPath().
 *   3. Resolves .env to 'process.resourcesPath' for production reading.
 *   4. Redirects all logs to %APPDATA%/edith-ai/logs/backend.log.
 */

const {
    app,
    BrowserWindow,
    Tray,
    Menu,
    globalShortcut,
    ipcMain,
    nativeImage
} = require('electron');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const kill = require('tree-kill');

// ── Path Resolution Helper (V41.0) ───────────────────────────────────────────
function getUnpackedPath(relPath) {
    if (!app.isPackaged) return path.join(app.getAppPath(), relPath);
    // In production, unpacked files are in resources/app.asar.unpacked/
    return path.join(process.resourcesPath, 'app.asar.unpacked', relPath);
}

// ── Environment Loading (V41.0) ──────────────────────────────────────────────
const ENV_PATH = app.isPackaged 
    ? path.join(process.resourcesPath, '.env') 
    : path.join(__dirname, '../.env');

if (fs.existsSync(ENV_PATH)) {
    require('dotenv').config({ path: ENV_PATH });
}

// ── Constants & Paths ─────────────────────────────────────────────────────────
const NODE_SERVER_URL = 'http://localhost:5000';
const LOG_DIR = path.join(app.getPath('userData'), 'logs');
const BACKEND_LOG = path.join(LOG_DIR, 'backend.log');

const FRONTEND_PATH = path.join(__dirname, '../edith/frontend/index.html');
const ICON_PATH = path.join(__dirname, '../assets/tray_icon.png');

const NODE_ENTRY = getUnpackedPath('edith/controller/server.js');
const PYTHON_ENTRY = getUnpackedPath('edith/ai_engine/ai.py');

// ── State ─────────────────────────────────────────────────────────────────────
let mainWindow = null;
let tray = null;
let backendReady = false;
let pollTimer = null;
const childProcesses = [];

// ── Logging Setup ─────────────────────────────────────────────────────────────
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
const logStream = fs.createWriteStream(BACKEND_LOG, { flags: 'a' });

function log(msg) {
    const entry = `[${new Date().toISOString()}] [MAIN] ${msg}\n`;
    logStream.write(entry);
    console.log(`[MAIN] ${msg}`);
}

// ── Service Orchestration (The Heart of V41.0) ───────────────────────────────
function spawnServices() {
    log('--- SPAWNING STARTUP (V41.0) ---');
    log(`Environment Path: ${ENV_PATH}`);
    log(`Node Script: ${NODE_ENTRY}`);
    log(`Python Script: ${PYTHON_ENTRY}`);

    /**
     * 1. Spawn Node Backend
     */
    const nodeBinary = 'node'; 
    const nodeModulesPath = app.isPackaged 
        ? path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules') 
        : path.join(app.getAppPath(), 'node_modules');

    const nodeEnv = { 
        ...process.env, 
        NODE_ENV: 'production', 
        PORT: 5000,
        NODE_PATH: nodeModulesPath
    };

    log(`Spawning Node: ${nodeBinary} [${NODE_ENTRY}]`);
    const nodeProcess = spawn(nodeBinary, [NODE_ENTRY], {
        cwd: path.dirname(NODE_ENTRY),
        env: nodeEnv,
        shell: false 
    });

    nodeProcess.stdout.on('data', (data) => logStream.write(`[NODE] ${data}`));
    nodeProcess.stderr.on('data', (data) => logStream.write(`[NODE_ERR] ${data}`));
    nodeProcess.on('exit', (code) => log(`Node process exited with code ${code}`));
    nodeProcess.on('error', (err) => log(`FAILED to spawn Node: ${err.message}`));
    childProcesses.push(nodeProcess);

    /**
     * 2. Spawn Python Core
     */
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    log(`Spawning Python: ${pythonCmd} [${PYTHON_ENTRY}]`);

    const pythonProcess = spawn(pythonCmd, [PYTHON_ENTRY], {
        cwd: path.dirname(PYTHON_ENTRY),
        env: { ...process.env },
        shell: false
    });

    pythonProcess.stdout.on('data', (data) => logStream.write(`[PYTHON] ${data}`));
    pythonProcess.stderr.on('data', (data) => logStream.write(`[PYTHON_ERR] ${data}`));
    pythonProcess.on('exit', (code) => log(`Python process exited with code ${code}`));
    pythonProcess.on('error', (err) => log(`FAILED to spawn Python: ${err.message}`));
    childProcesses.push(pythonProcess);

    log('--- SPAWNING INITIATED ---');
}

function killServices() {
    log('Stopping all backend services...');
    childProcesses.forEach((proc) => {
        if (proc.pid) {
            kill(proc.pid, 'SIGTERM', (err) => {
                if (err) log(`Kill error (PID ${proc.pid}): ${err}`);
            });
        }
    });
}

// ── Backend Health Check ──────────────────────────────────────────────────────
function checkBackend() {
    return new Promise((resolve) => {
        const req = http.get(`${NODE_SERVER_URL}/api/status`, (res) => {
            resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(1000, () => { req.destroy(); resolve(false); });
    });
}

function startHealthPolling() {
    pollTimer = setInterval(async () => {
        const isUp = await checkBackend();
        if (isUp !== backendReady) {
            backendReady = isUp;
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('backend-status', isUp ? 'up' : 'down');
            }
        }
    }, 2000);
}

// ── UI & App Lifecycle ────────────────────────────────────────────────────────
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1050, height: 850, minWidth: 800, minHeight: 600,
        frame: false, backgroundColor: '#05070a', show: false,
        icon: ICON_PATH,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true, nodeIntegration: false, sandbox: true
        }
    });

    mainWindow.loadFile(FRONTEND_PATH);
    mainWindow.once('ready-to-show', () => mainWindow.show());
    mainWindow.on('close', (e) => { if (!app.isQuitting) { e.preventDefault(); mainWindow.hide(); } });
}

function createTray() {
    const icon = nativeImage.createFromPath(ICON_PATH);
    tray = new Tray(icon.resize({ width: 16, height: 16 }));
    const getMenu = () => Menu.buildFromTemplate([
        { label: '🤖 Open EDITH', click: () => { mainWindow.show(); mainWindow.focus(); } },
        { type: 'separator' },
        { label: backendReady ? '✅ Backend: Online' : '⏳ Backend: Connecting...', enabled: false },
        { label: '📂 Open Logs', click: () => require('electron').shell.openPath(LOG_DIR) },
        { type: 'separator' },
        { label: '❌ Quit EDITH', click: () => { app.isQuitting = true; app.quit(); } }
    ]);
    tray.setToolTip('EDITH AI');
    tray.setContextMenu(getMenu());
    setInterval(() => tray.setContextMenu(getMenu()), 5000);
}

app.whenReady().then(() => {
    spawnServices();
    createWindow();
    createTray();
    
    globalShortcut.register('Control+Space', () => {
        if (!mainWindow) return;
        if (mainWindow.isVisible() && mainWindow.isFocused()) mainWindow.hide();
        else { mainWindow.show(); mainWindow.focus(); }
    });

    ipcMain.handle('check-health', async () => ({ up: await checkBackend() }));
    ipcMain.on('hide-window', () => mainWindow && mainWindow.hide());
    ipcMain.on('minimize-window', () => mainWindow && mainWindow.minimize());
    
    startHealthPolling();
});

app.on('before-quit', () => {
    app.isQuitting = true;
    killServices();
});
