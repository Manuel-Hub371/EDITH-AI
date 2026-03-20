/**
 * EDITH Electron Main Process (V40.4) — Solid-State Production
 * ──────────────────────────────────────────────────────────
 * Enhancements:
 *   1. Uses Electron's native 'utilityProcess' for Node (More robust than spawn).
 *   2. Forced absolute path resolution for all backend entries.
 *   3. Direct environment injection (Fixes missing GOOGLE_API_KEY).
 *   4. Shell-less spawning for Python (Fixes "EDITH AI" space bug).
 *   5. AppData logging for persistent diagnostics.
 */

const {
    app,
    BrowserWindow,
    Tray,
    Menu,
    globalShortcut,
    ipcMain,
    nativeImage,
    utilityProcess
} = require('electron');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const kill = require('tree-kill');

// Load .env explicitly from the true project root
const envPath = app.isPackaged 
    ? path.join(process.resourcesPath, 'app.asar', '.env')
    : path.join(__dirname, '../.env');

require('dotenv').config({ path: envPath });

// ── Path Resolution ─────────────────────────────────────────────────────────
function getUnpackedPath(relPath) {
    const root = app.isPackaged 
        ? app.getAppPath().replace('app.asar', 'app.asar.unpacked') 
        : app.getAppPath();
    return path.resolve(root, relPath);
}

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
let nodeChild = null;
let pythonChild = null;

// ── Logging Setup ─────────────────────────────────────────────────────────────
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
const logStream = fs.createWriteStream(BACKEND_LOG, { flags: 'a' });

function log(msg) {
    const entry = `[${new Date().toISOString()}] [MAIN] ${msg}\n`;
    logStream.write(entry);
    console.log(`[MAIN] ${msg}`);
}

// ── Service Orchestration ───────────────────────────────────────────────────
function spawnServices() {
    log(`Initializing Services V40.4 (Solid-State)`);
    log(`Packaged: ${app.isPackaged}`);
    log(`Node Entry: ${NODE_ENTRY}`);
    log(`Python Entry: ${PYTHON_ENTRY}`);
    log(`Env Path Used: ${envPath}`);
    log(`API Key Loaded: ${process.env.GOOGLE_API_KEY ? 'Yes' : 'No'}`);

    /**
     * 1. Spawn Node Backend (UtilityProcess)
     * UtilityProcess is the most stable way to run a node script in an Electron app.
     */
    try {
        log('Launching Node UtilityProcess...');
        nodeChild = utilityProcess.fork(NODE_ENTRY, [], {
            env: { ...process.env, NODE_PORT: 5000, NODE_ENV: 'production' },
            stdio: 'pipe'
        });

        nodeChild.stdout.on('data', (data) => logStream.write(`[NODE] ${data}`));
        nodeChild.stderr.on('data', (data) => logStream.write(`[NODE_ERR] ${data}`));
        
        nodeChild.on('exit', (code) => log(`Node process exited with code ${code}`));
        nodeChild.on('spawn', () => log('Node process successfully spawned.'));

    } catch (err) {
        log(`CRITICAL: Node Fork Failed: ${err.message}`);
    }

    /**
     * 2. Spawn Python Core
     * Using shell:false to avoid "EDITH AI" space mangling.
     */
    try {
        log('Launching Python Core...');
        const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
        pythonChild = spawn(pythonCmd, [PYTHON_ENTRY], {
            cwd: path.dirname(PYTHON_ENTRY),
            env: { ...process.env },
            shell: false
        });

        pythonChild.stdout.on('data', (data) => logStream.write(`[PYTHON] ${data}`));
        pythonChild.stderr.on('data', (data) => logStream.write(`[PYTHON_ERR] ${data}`));
        
        pythonChild.on('error', (err) => log(`Python Spawn Error: ${err.message}`));
        pythonChild.on('close', (code) => log(`Python process closed with ${code}`));

    } catch (err) {
        log(`CRITICAL: Python Spawn Failed: ${err.message}`);
    }
}

function killServices() {
    log('Terminating backend services...');
    if (nodeChild) nodeChild.kill();
    if (pythonChild && pythonChild.pid) {
        kill(pythonChild.pid, 'SIGTERM', (err) => {
            if (err) log(`Kill Python error: ${err}`);
        });
    }
}

// ── Backend Health Check ──────────────────────────────────────────────────────
function checkBackend() {
    return new Promise((resolve) => {
        const req = http.get('http://localhost:5000/api/status', (res) => {
            resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(1000, () => { req.destroy(); resolve(false); });
    });
}

function startHealthPolling() {
    let failCount = 0;
    pollTimer = setInterval(async () => {
        const isUp = await checkBackend();
        if (isUp !== backendReady) {
            backendReady = isUp;
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('backend-status', isUp ? 'up' : 'down');
            }
        }
        
        if (!isUp && app.isPackaged) {
            failCount++;
            if (failCount > 15) { // 30 seconds
                log('Handshake Timeout: Opening Diagnostics...');
                if (mainWindow) mainWindow.webContents.openDevTools({ mode: 'detach' });
                failCount = -999;
            }
        } else {
            failCount = 0;
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
