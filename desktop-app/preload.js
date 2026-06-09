const { contextBridge, ipcRenderer } = require('electron');

// Expose EDITH/NovaGen API to the renderer process
contextBridge.exposeInMainWorld('edith', {
  // Window controls
  window: {
    minimize: () => ipcRenderer.send('window-minimize'),
    toggleMaximize: () => ipcRenderer.send('window-maximize-toggle'),
    close: () => ipcRenderer.send('window-close'),
    onMaximized: (cb) => ipcRenderer.on('window-maximized', (_, val) => cb(val)),
    onFocus: (cb) => ipcRenderer.on('window-focus', (_, val) => cb(val)),
    isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  },

  // Menu actions forwarded from main
  onMenuAction: (cb) => ipcRenderer.on('menu-action', (_, action) => cb(action)),

  // File system
  fs: {
    openFolderDialog: () => ipcRenderer.invoke('open-folder-dialog'),
    openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
    saveFileDialog: (defaultPath) => ipcRenderer.invoke('save-file-dialog', defaultPath),
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
    writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
    readDirectory: (dirPath) => ipcRenderer.invoke('read-directory', dirPath),
    createFile: (filePath) => ipcRenderer.invoke('create-file', filePath),
    createDirectory: (dirPath) => ipcRenderer.invoke('create-directory', dirPath),
    renamePath: (oldPath, newPath) => ipcRenderer.invoke('rename-path', oldPath, newPath),
    deletePath: (targetPath) => ipcRenderer.invoke('delete-path', targetPath),
    pathExists: (targetPath) => ipcRenderer.invoke('path-exists', targetPath),
  },

  // Path utilities
  path: {
    getHomeDir: () => ipcRenderer.invoke('get-home-dir'),
    getSep: () => ipcRenderer.invoke('get-path-sep'),
    join: (...parts) => ipcRenderer.invoke('join-paths', ...parts),
    basename: (p) => ipcRenderer.invoke('basename', p),
    dirname: (p) => ipcRenderer.invoke('dirname', p),
  },

  // Dialogs
  dialog: {
    showConfirm: (options) => ipcRenderer.invoke('show-confirm-dialog', options),
  },

  // Workspace
  workspace: {
    getPath: () => ipcRenderer.invoke('workspace:get-path'),
    selectFolder: () => ipcRenderer.invoke('workspace:select-folder'),
    closeFolder: () => ipcRenderer.invoke('workspace:close-folder'),
  },

  // Terminal
  terminal: {
    write: (data) => ipcRenderer.send('terminal:write', data),
    onData: (cb) => ipcRenderer.on('terminal:data', (_, data) => cb(data)),
  },

  // Run operations
  run: {
    file: (options) => ipcRenderer.invoke('run:file', options),
    kill: () => ipcRenderer.invoke('run:kill'),
    onOutput: (cb) => ipcRenderer.on('run:output', (_, data) => cb(data)),
  },

  // File operations
  file: {
    openExternal: (filePath) => ipcRenderer.invoke('file:open-external', filePath),
  },

  // Zoom
  zoom: {
    get: () => ipcRenderer.invoke('zoom:get'),
    set: (factor) => ipcRenderer.invoke('zoom:set', factor),
  },

  // System info
  system: {
    getInfo: () => ipcRenderer.invoke('system:info'),
  },

  // Open VSX API proxy (bypasses file:// CORS restriction)
  openVsx: {
    fetch: (url) => ipcRenderer.invoke('openvsx:fetch', url),
  },

  // Navigation between modes
  navigation: {
    loadAgentMode: () => ipcRenderer.invoke('navigation:load-agent-mode'),
    loadNormalMode: () => ipcRenderer.invoke('navigation:load-normal-mode'),
  },
});

// Also expose as 'novagen' for compatibility with NovaGen code
contextBridge.exposeInMainWorld('novagen', {
  window: {
    minimize: () => ipcRenderer.send('window-minimize'),
    toggleMaximize: () => ipcRenderer.send('window-maximize-toggle'),
    close: () => ipcRenderer.send('window-close'),
    onMaximized: (cb) => ipcRenderer.on('window-maximized', (_, val) => cb(val)),
    onFocus: (cb) => ipcRenderer.on('window-focus', (_, val) => cb(val)),
  },
  onMenuAction: (cb) => ipcRenderer.on('menu-action', (_, action) => cb(action)),
  fs: {
    openFolderDialog: () => ipcRenderer.invoke('open-folder-dialog'),
    openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
    saveFileDialog: (defaultPath) => ipcRenderer.invoke('save-file-dialog', defaultPath),
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
    writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
    readDirectory: (dirPath) => ipcRenderer.invoke('read-directory', dirPath),
    createFile: (filePath) => ipcRenderer.invoke('create-file', filePath),
    createDirectory: (dirPath) => ipcRenderer.invoke('create-directory', dirPath),
    renamePath: (oldPath, newPath) => ipcRenderer.invoke('rename-path', oldPath, newPath),
    deletePath: (targetPath) => ipcRenderer.invoke('delete-path', targetPath),
    pathExists: (targetPath) => ipcRenderer.invoke('path-exists', targetPath),
  },
  path: {
    getHomeDir: () => ipcRenderer.invoke('get-home-dir'),
    getSep: () => ipcRenderer.invoke('get-path-sep'),
    join: (...parts) => ipcRenderer.invoke('join-paths', ...parts),
    basename: (p) => ipcRenderer.invoke('basename', p),
    dirname: (p) => ipcRenderer.invoke('dirname', p),
  },
  dialog: {
    showConfirm: (options) => ipcRenderer.invoke('show-confirm-dialog', options),
  },
  run: {
    file: (options) => ipcRenderer.invoke('run:file', options),
    kill: () => ipcRenderer.invoke('run:kill'),
    onOutput: (cb) => ipcRenderer.on('run:output', (_, data) => cb(data)),
  },
  file: {
    openExternal: (filePath) => ipcRenderer.invoke('file:open-external', filePath),
  },
  
  // Navigation between modes
  navigation: {
    loadAgentMode: () => ipcRenderer.invoke('navigation:load-agent-mode'),
    loadNormalMode: () => ipcRenderer.invoke('navigation:load-normal-mode'),
  },
});
