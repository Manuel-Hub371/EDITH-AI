const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Shell/Terminal integration
  writeTerminal: (data) => ipcRenderer.send('terminal:write', data),
  onTerminalData: (callback) => ipcRenderer.on('terminal:data', (event, data) => callback(data)),

  // Workspace and Filesystem CRUD
  getWorkspacePath: () => ipcRenderer.invoke('workspace:get-path'),
  readDir: () => ipcRenderer.invoke('fs:read-dir'),
  readFile: (relPath) => ipcRenderer.invoke('fs:read-file', relPath),
  writeFile: (relPath, content) => ipcRenderer.invoke('fs:write-file', { relPath, content }),
  createFile: (relPath) => ipcRenderer.invoke('fs:create-file', relPath),
  createFolder: (relPath) => ipcRenderer.invoke('fs:create-folder', relPath),
  deleteItem: (relPath) => ipcRenderer.invoke('fs:delete', relPath),
  selectFolder: () => ipcRenderer.invoke('workspace:select-folder'),
  closeFolder: () => ipcRenderer.invoke('workspace:close-folder'),

  // Platform environment
  platform: process.platform,

  // System info (CPU, RAM, uptime)
  getSystemInfo: () => ipcRenderer.invoke('system:info'),

  // IDE Zoom — scales the entire window
  getZoom: () => ipcRenderer.invoke('zoom:get'),
  setZoom: (factor) => ipcRenderer.invoke('zoom:set', factor),

  // Run File — spawns process and streams output
  runFile: (opts) => ipcRenderer.invoke('run:file', opts),
  killRun: () => ipcRenderer.invoke('run:kill'),
  onRunOutput: (callback) => ipcRenderer.on('run:output', (event, data) => callback(data)),
  offRunOutput: () => ipcRenderer.removeAllListeners('run:output'),

  // Window controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  isWindowMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  onWindowStateChanged: (callback) => ipcRenderer.on('window:state-changed', (event, state) => callback(state)),

  // Backward compatibility legacy methods
  sendMessage: (channel, data) => ipcRenderer.send(channel, data),
  onMessage: (channel, callback) => ipcRenderer.on(channel, (event, ...args) => callback(...args)),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});
