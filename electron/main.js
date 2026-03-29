const { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain, nativeImage } = require('electron');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const kill = require('tree-kill');

// Re-defining for minimal stability
const NODE_SERVER_URL = 'http://localhost:5000';

// ── State ─────────────────────────────────────────────────────────────────────
let mainWindow = null;
let tray = null;
let backendReady = false;
let pollTimer = null;
let nodeProcess = null;
let pythonProcess = null;
let logStream = null;

// ── Path Resolution Helper (V41.0) ───────────────────────────────────────────
function getUnpackedPath(relPath) {
    if (!app.isPackaged) return path.join(app.getAppPath(), relPath);
    return path.join(process.resourcesPath, 'app.asar.unpacked', relPath);
}

function getLogDir() {
    return path.join(app.getPath('userData'), 'logs');
}

function getBackendLogPath() {
    return path.join(getLogDir(), 'backend.log');
}
const FRONTEND_PATH = path.join(__dirname, '../edith/frontend/index.html');
const ICON_PATH = path.join(__dirname, '../assets/tray_icon.png');

async function killExistingOnPort(port) {
    return new Promise((r) => spawn('powershell', ['-Command', `Stop-Process -Id (Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue).OwningProcess -Force -ErrorAction SilentlyContinue`]).on('exit', () => r()));
}

async function spawnServices() {
    await killExistingOnPort(5000);
    nodeProcess = spawn('node', [path.join(__dirname, '../edith/controller/server.js')], { cwd: path.join(__dirname, '..'), env: { ...process.env, PORT: 5000 } });
    await killExistingOnPort(8000);
    pythonProcess = spawn('python', [path.join(__dirname, '../edith/ai_engine/ai.py')], { cwd: path.join(__dirname, '..'), env: { ...process.env } });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1050, height: 850, frame: false, backgroundColor: '#05070a',
        webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
    });
    mainWindow.loadFile(FRONTEND_PATH);
}

app.whenReady().then(() => {
    spawnServices();
    createWindow();
});

app.on('before-quit', () => {
    if (nodeProcess) kill(nodeProcess.pid);
    if (pythonProcess) kill(pythonProcess.pid);
});
