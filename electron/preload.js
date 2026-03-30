/**
 * EDITH Preload Script (V39)
 * Provides a secure bridge between the renderer and Electron APIs.
 * Runs in a sandboxed context before the page loads.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('edith', {
    checkHealth: () => ipcRenderer.invoke('check-health'),
    getVersion: () => ipcRenderer.invoke('get-version'),
    
    // Window Controls
    hideWindow: () => ipcRenderer.send('hide-window'),
    minimizeWindow: () => ipcRenderer.send('minimize-window'),
    maximizeWindow: () => ipcRenderer.send('maximize-window'),
    closeWindow: () => ipcRenderer.send('close-window'), // Usually hides to tray

    onBackendStatus: (callback) => {
        ipcRenderer.on('backend-status', (_event, status) => callback(status));
    }
});
