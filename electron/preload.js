/**
 * EDITH Preload Script (V39)
 * Provides a secure bridge between the renderer and Electron APIs.
 * Runs in a sandboxed context before the page loads.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('edith', {
    /**
     * Check if the backend Node server is ready.
     */
    checkHealth: () => ipcRenderer.invoke('check-health'),

    /**
     * Get the current app version.
     */
    getVersion: () => ipcRenderer.invoke('get-version'),

    /**
     * Show/hide the window programmatically.
     */
    hideWindow: () => ipcRenderer.send('hide-window'),

    /**
     * Listen for backend status updates from the main process.
     * @param {Function} callback - Called with (status: 'up' | 'down')
     */
    onBackendStatus: (callback) => {
        ipcRenderer.on('backend-status', (_event, status) => callback(status));
    }
});
