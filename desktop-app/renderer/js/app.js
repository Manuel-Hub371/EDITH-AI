/* ─── App Bootstrap ───────────────────────────────────────────────────────── */

const App = (() => {
  let sidebarVisible = true;
  let currentTheme = 'nova-dark';
  let settings = {
    fontSize: 14,
    tabSize: 2,
    wordWrap: 'off',
    minimap: true,
    lineNumbers: 'on',
    theme: 'nova-dark',
  };

  // ─── Init ─────────────────────────────────────────────────────────────────

  async function init() {
    // Init Monaco editor
    await EditorManager.init();

    // Init terminal
    Terminal.init();

    // Init AI Panel
    AIPanel.init();

    // Init Extensions Manager
    ExtensionsManager.init();

    // Sidebar resize
    initSidebarResize();

    // Activity bar
    initActivityBar();

    // NOTE: Window controls are handled by titlebar.js — not here.

    // Keyboard shortcuts
    initKeyboardShortcuts();

    // Menu actions from main process
    window.novagen.onMenuAction((action) => handleMenuAction(action));

    // Settings panel apply
    document.getElementById('btn-apply-settings').addEventListener('click', applySettingsFromPanel);

    // Welcome screen actions
    document.getElementById('welcome-new-file').addEventListener('click', (e) => { e.preventDefault(); EditorManager.newFile(); });
    document.getElementById('welcome-open-file').addEventListener('click', async (e) => { e.preventDefault(); const paths = await window.novagen.fs.openFileDialog(); if (paths && paths.length) { for (const p of paths) await EditorManager.openFile(p); } });
    document.getElementById('welcome-open-folder').addEventListener('click', async (e) => { e.preventDefault(); const path = await window.novagen.fs.openFolderDialog(); if (path) FileTree.openFolder(path); });

    // Split editor button
    document.getElementById('btn-split-editor').addEventListener('click', () => {
      Notifications.info('Split Editor', 'Split editor view coming soon.');
    });

    // Terminal new/kill
    document.getElementById('btn-new-terminal').addEventListener('click', () => Terminal.show());

    // Clear AI history
    document.getElementById('btn-clear-ai').addEventListener('click', () => AIPanel.clearHistory());

    // Go-to-line event from command palette
    document.addEventListener('goto-line', (e) => {
      const n = e.detail;
      if (window.__monacoEditor) {
        window.__monacoEditor.revealLineInCenter(n);
        window.__monacoEditor.setPosition({ lineNumber: n, column: 1 });
      }
    });

    // Load saved settings
    loadSettings();

    // Set up run output listener
    setupRunOutputListener();

    console.log('EDITH initialized');
  }

  // ─── Activity Bar ─────────────────────────────────────────────────────────

  function initActivityBar() {
    document.querySelectorAll('.activity-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const panel = btn.dataset.panel;
        const wasActive = btn.classList.contains('active');

        document.querySelectorAll('.activity-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.sidebar-panel').forEach(p => p.classList.remove('active'));

        if (wasActive) {
          // Toggle sidebar off
          toggleSidebar(false);
        } else {
          if (!sidebarVisible) toggleSidebar(true);
          btn.classList.add('active');
          const panelEl = document.getElementById(`panel-${panel}`);
          if (panelEl) panelEl.classList.add('active');
        }
      });
    });
  }

  // ─── Sidebar Resize ───────────────────────────────────────────────────────

  function initSidebarResize() {
    const resizer = document.getElementById('sidebar-resizer');
    const sidebar = document.getElementById('sidebar');
    let resizing = false, startX = 0, startW = 0;

    resizer.addEventListener('mousedown', (e) => {
      resizing = true;
      startX = e.clientX;
      startW = sidebar.offsetWidth;
      resizer.classList.add('dragging');
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!resizing) return;
      const w = Math.max(150, Math.min(600, startW + e.clientX - startX));
      sidebar.style.width = `${w}px`;
      document.documentElement.style.setProperty('--sidebar-width', `${w}px`);
      EditorManager.layout();
    });

    document.addEventListener('mouseup', () => {
      if (resizing) { resizing = false; resizer.classList.remove('dragging'); }
    });
  }

  // ─── Keyboard Shortcuts ───────────────────────────────────────────────────

  function initKeyboardShortcuts() {
    document.addEventListener('keydown', async (e) => {
      const ctrl = e.ctrlKey || e.metaKey;

      // Command Palette — handled by titlebar.js (Ctrl+P / Ctrl+Shift+P)
      // kept here as fallback in case titlebar isn't loaded
      if (ctrl && e.shiftKey && e.key === 'P') { e.preventDefault(); if (window.CommandPalette) CommandPalette.show(); return; }

      // New File
      if (ctrl && e.key === 'n') { e.preventDefault(); EditorManager.newFile(); return; }

      // New Folder
      if (ctrl && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        const btn = document.getElementById('btn-new-folder');
        if (btn) btn.click();
        return;
      }

      // Open File
      if (ctrl && !e.shiftKey && e.key === 'o') {
        e.preventDefault();
        const paths = await window.novagen.fs.openFileDialog();
        if (paths && paths.length) for (const p of paths) await EditorManager.openFile(p);
        return;
      }

      // Open Folder
      if (ctrl && e.shiftKey && e.key === 'O') {
        e.preventDefault();
        const path = await window.novagen.fs.openFolderDialog();
        if (path) FileTree.openFolder(path);
        return;
      }

      // Save
      if (ctrl && !e.shiftKey && e.key === 's') { e.preventDefault(); await EditorManager.saveCurrentFile(); return; }

      // Save As
      if (ctrl && e.shiftKey && e.key === 'S') { e.preventDefault(); await EditorManager.saveAs(); return; }

      // Toggle Sidebar
      if (ctrl && e.key === 'b') { e.preventDefault(); toggleSidebar(); return; }

      // Toggle Terminal
      if (ctrl && e.key === '`') { e.preventDefault(); Terminal.toggle(); return; }

      // Toggle AI Panel
      if (ctrl && e.shiftKey && e.key === 'A') { e.preventDefault(); AIPanel.toggle(); return; }

      // Run File (F5 or Ctrl+F5)
      if (e.key === 'F5') {
        e.preventDefault();
        runCurrentFile();
        return;
      }

      // Close Tab
      if (ctrl && e.key === 'w') {
        e.preventDefault();
        const tab = TabManager.getActive();
        if (tab) {
          if (tab.dirty) {
            const res = await Modal.confirm('Unsaved Changes', `Save "${tab.name}" before closing?`, 'Save');
            if (res === true) await EditorManager.saveFile(tab.id);
          }
          TabManager.closeTab(tab.id);
          EditorManager.destroyTab(tab.id);
        }
        return;
      }

      // Cycle tabs
      if (ctrl && e.key === 'Tab') {
        e.preventDefault();
        const tabs = TabManager.getTabs();
        const active = TabManager.getActive();
        if (tabs.length > 1 && active) {
          const idx = tabs.findIndex(t => t.id === active.id);
          const next = e.shiftKey ? tabs[(idx - 1 + tabs.length) % tabs.length] : tabs[(idx + 1) % tabs.length];
          TabManager.setActive(next.id);
          EditorManager.activateTab(next.id, next.path);
        }
        return;
      }

      // Go to Line
      if (ctrl && e.key === 'g') { e.preventDefault(); CommandPalette.show(); document.getElementById('command-palette-input').value = ':'; return; }
    });
  }

  // ─── Menu Actions ─────────────────────────────────────────────────────────

  async function handleMenuAction(action) {
    switch (action) {
      case 'new-file':    EditorManager.newFile(); break;
      case 'open-file': { const ps = await window.novagen.fs.openFileDialog(); if (ps) for (const p of ps) await EditorManager.openFile(p); break; }
      case 'open-folder': { const p = await window.novagen.fs.openFolderDialog(); if (p) FileTree.openFolder(p); break; }
      case 'save':        await EditorManager.saveCurrentFile(); break;
      case 'save-as':     await EditorManager.saveAs(); break;
      case 'find':        EditorManager.openFind(); break;
      case 'replace':     EditorManager.openReplace(); break;
      case 'toggle-sidebar': toggleSidebar(); break;
      case 'toggle-terminal': Terminal.toggle(); break;
      case 'about':       Modal.alert('About EDITH', 'EDITH — Next-Generation AI Engineering\nVersion 1.0.0\n\nBuilt with Electron + Monaco Editor'); break;
    }
  }

  // ─── Sidebar toggle ───────────────────────────────────────────────────────

  function toggleSidebar(forceShow) {
    const sidebar  = document.getElementById('sidebar');
    const resizer  = document.getElementById('sidebar-resizer');
    sidebarVisible = forceShow !== undefined ? forceShow : !sidebarVisible;
    sidebar.style.display  = sidebarVisible ? '' : 'none';
    resizer.style.display  = sidebarVisible ? '' : 'none';
    EditorManager.layout();
  }

  // ─── Theme ────────────────────────────────────────────────────────────────

  function applyTheme(themeId) {
    currentTheme = themeId;
    document.documentElement.dataset.theme = themeId === 'nova-dark' ? '' : themeId;
    EditorManager.setTheme(themeId);
    settings.theme = themeId;
    saveSettings();
  }

  // ─── Settings ─────────────────────────────────────────────────────────────

  function applySettingsFromPanel() {
    const fontSize    = parseInt(document.getElementById('setting-font-size').value) || 14;
    const tabSize     = parseInt(document.getElementById('setting-tab-size').value) || 2;
    const wordWrap    = document.getElementById('setting-word-wrap').value;
    const minimap     = document.getElementById('setting-minimap').checked;
    const lineNumbers = document.getElementById('setting-line-numbers').value;
    const theme       = document.getElementById('setting-theme').value;

    settings = { fontSize, tabSize, wordWrap, minimap, lineNumbers, theme };
    EditorManager.applySettings(settings);
    applyTheme(theme);
    StatusBar.setSpaces(tabSize);
    saveSettings();
    Notifications.success('Settings Applied', 'Your settings have been saved.');
  }

  function saveSettings() {
    try { localStorage.setItem('edith-settings', JSON.stringify(settings)); } catch {}
  }

  function loadSettings() {
    try {
      let saved = localStorage.getItem('edith-settings');
      if (!saved) {
        saved = localStorage.getItem('novagen-settings');
      }
      if (saved) {
        settings = { ...settings, ...JSON.parse(saved) };
        EditorManager.applySettings(settings);
        if (settings.theme) applyTheme(settings.theme);
        StatusBar.setSpaces(settings.tabSize || 2);

        // Sync panel UI
        document.getElementById('setting-font-size').value   = settings.fontSize;
        document.getElementById('setting-tab-size').value    = settings.tabSize;
        document.getElementById('setting-word-wrap').value   = settings.wordWrap;
        document.getElementById('setting-minimap').checked   = settings.minimap;
        document.getElementById('setting-line-numbers').value = settings.lineNumbers;
        document.getElementById('setting-theme').value       = settings.theme;
      }
    } catch {}
  }

  // ─── Run Current File ─────────────────────────────────────────────────────

  let currentRunProcess = null;
  let runOutputListenerSetup = false;

  function setupRunOutputListener() {
    if (runOutputListenerSetup) return;
    if (!window.novagen || !window.novagen.run) {
      console.error('[App] novagen.run not available for output listener');
      return;
    }

    console.log('[App] Setting up run output listener');
    
    window.novagen.run.onOutput((data) => {
      console.log('[App] Received run output:', data);
      
      if (data.type === 'stdout') {
        data.data.split('\n').forEach(line => {
          if (line) appendRunOutput(line, 'stdout');
        });
      } else if (data.type === 'stderr') {
        data.data.split('\n').forEach(line => {
          if (line) appendRunOutput(line, 'stderr');
        });
      } else if (data.type === 'exit') {
        appendRunOutput('═'.repeat(60), 'separator');
        if (data.code === 0) {
          appendRunOutput(`✓ Process completed successfully (exit code: ${data.code})`, 'success');
          setRunStatus('success');
          Notifications.success('Run Complete', 'File executed successfully');
        } else {
          appendRunOutput(`✗ Process exited with code: ${data.code}`, 'error');
          setRunStatus('error');
          Notifications.error('Run Failed', `Exit code: ${data.code}`);
        }
        currentRunProcess = null;
        document.getElementById('btn-stop-run').disabled = true;
      } else if (data.type === 'error') {
        appendRunOutput('═'.repeat(60), 'separator');
        appendRunOutput(`✗ Error: ${data.message}`, 'error');
        setRunStatus('error');
        currentRunProcess = null;
        document.getElementById('btn-stop-run').disabled = true;
      }
    });

    runOutputListenerSetup = true;
  }

  async function runCurrentFile() {
    console.log('[App] runCurrentFile called');
    
    const activeTab = TabManager.getActive();
    if (!activeTab) {
      console.log('[App] No active tab');
      Notifications.warn('No File Open', 'Open a file to run it');
      return;
    }

    console.log('[App] Active tab:', activeTab);

    // Save file before running
    if (activeTab.dirty) {
      console.log('[App] File is dirty, saving...');
      await EditorManager.saveFile(activeTab.id);
    }

    const filePath = activeTab.path;
    if (filePath.startsWith('untitled-')) {
      console.log('[App] File is untitled');
      Notifications.warn('Save File First', 'Save the file before running it');
      return;
    }

    const fileName = filePath.split(/[/\\]/).pop();
    const ext = fileName.split('.').pop().toLowerCase();
    
    console.log('[App] File info:', { fileName, ext, filePath });

    // Check if Terminal module is available
    if (!window.Terminal || typeof Terminal.switchPanel !== 'function') {
      console.error('[App] Terminal module not available or switchPanel not found');
      Notifications.error('Error', 'Terminal module not loaded. Please refresh the app.');
      return;
    }

    // Switch to Run Output panel
    console.log('[App] Switching to run-output panel');
    Terminal.switchPanel('run-output');
    if (Terminal.isCollapsed) {
      console.log('[App] Terminal is collapsed, toggling');
      Terminal.toggle();
    }

    // Clear previous output
    console.log('[App] Clearing run output');
    clearRunOutput();

    // Update UI
    document.getElementById('run-file-name').textContent = fileName;
    setRunStatus('running');
    document.getElementById('btn-stop-run').disabled = false;

    appendRunOutput(`Running: ${fileName}`, 'info');
    appendRunOutput(`File: ${filePath}`, 'info');
    appendRunOutput('═'.repeat(60), 'separator');

    // Determine command based on file extension
    let command, args = [];

    switch (ext) {
      case 'py':
        command = 'python';
        args = [filePath];
        break;
      case 'js':
        command = 'node';
        args = [filePath];
        break;
      case 'ts':
        command = 'ts-node';
        args = [filePath];
        break;
      case 'mjs':
      case 'cjs':
        command = 'node';
        args = [filePath];
        break;
      case 'html':
      case 'htm':
        // Open in browser
        await window.novagen.file.openExternal(filePath);
        setRunStatus('success');
        appendRunOutput('═'.repeat(60), 'separator');
        appendRunOutput('✓ File opened in default browser', 'success');
        document.getElementById('btn-stop-run').disabled = true;
        return;
      case 'java':
        command = 'javac';
        args = [filePath];
        // Will compile first, then run in the output handler
        break;
      case 'c':
        command = 'gcc';
        args = [filePath, '-o', filePath.replace('.c', '.exe')];
        break;
      case 'cpp':
      case 'cc':
      case 'cxx':
        command = 'g++';
        args = [filePath, '-o', filePath.replace(/\.(cpp|cc|cxx)$/, '.exe')];
        break;
      case 'go':
        command = 'go';
        args = ['run', filePath];
        break;
      case 'rs':
        command = 'rustc';
        args = [filePath];
        break;
      case 'sh':
        command = process.platform === 'win32' ? 'bash' : 'sh';
        args = [filePath];
        break;
      case 'bat':
        command = 'cmd';
        args = ['/c', filePath];
        break;
      case 'ps1':
        command = 'powershell';
        args = ['-ExecutionPolicy', 'Bypass', '-File', filePath];
        break;
      case 'rb':
        command = 'ruby';
        args = [filePath];
        break;
      case 'php':
        command = 'php';
        args = [filePath];
        break;
      case 'pl':
        command = 'perl';
        args = [filePath];
        break;
      default:
        setRunStatus('error');
        appendRunOutput('═'.repeat(60), 'separator');
        appendRunOutput(`✗ Unsupported file type: .${ext}`, 'error');
        appendRunOutput('\nSupported types: .py, .js, .ts, .java, .c, .cpp, .go, .rs, .html, .sh, .bat, .ps1, .rb, .php, .pl', 'info');
        document.getElementById('btn-stop-run').disabled = true;
        return;
    }

    // Execute the file
    try {
      // Fix path directory extraction
      const pathSep = filePath.includes('/') ? '/' : '\\';
      const lastSepIndex = filePath.lastIndexOf(pathSep);
      const workDir = lastSepIndex > 0 ? filePath.substring(0, lastSepIndex) : null;

      console.log('[App] Running file:', { command, args, cwd: workDir, filePath });

      const result = await window.novagen.run.file({
        command,
        args,
        cwd: workDir,
        filePath
      });

      console.log('[App] Run result:', result);

      if (!result.started) {
        throw new Error(result.error || 'Failed to start process');
      }

      currentRunProcess = { command, args, filePath, ext };
    } catch (error) {
      console.error('[App] Run error:', error);
      setRunStatus('error');
      appendRunOutput('═'.repeat(60), 'separator');
      appendRunOutput(`✗ Failed to run: ${error.message}`, 'error');
      document.getElementById('btn-stop-run').disabled = true;
    }
  }

  function clearRunOutput() {
    const outputEl = document.getElementById('run-output-text');
    if (!outputEl) {
      console.error('[App] run-output-text element not found');
      return;
    }
    outputEl.innerHTML = '';
    console.log('[App] Run output cleared');
  }

  function appendRunOutput(text, type = 'stdout') {
    const output = document.getElementById('run-output-text');
    if (!output) {
      console.error('[App] run-output-text element not found, cannot append:', text);
      return;
    }
    const line = document.createElement('div');
    line.className = `run-output-${type}`;
    line.textContent = text;
    output.appendChild(line);
    output.parentElement.scrollTop = output.parentElement.scrollHeight;
  }

  function setRunStatus(status) {
    const statusEl = document.getElementById('run-status');
    if (!statusEl) {
      console.error('[App] run-status element not found');
      return;
    }
    statusEl.className = `run-status-${status}`;
    statusEl.textContent = status.toUpperCase();
    console.log('[App] Status set to:', status);
  }

  async function stopRun() {
    if (currentRunProcess) {
      const result = await window.novagen.run.kill();
      if (result.killed) {
        appendRunOutput('═'.repeat(60), 'separator');
        appendRunOutput('Process terminated by user', 'warn');
        setRunStatus('error');
      }
      currentRunProcess = null;
      document.getElementById('btn-stop-run').disabled = true;
    }
  }

  return { init, toggleSidebar, applyTheme, runCurrentFile, stopRun };
})();

// ─── Start ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  App.init();
  
  // Wire up run buttons after DOM is ready with error handling
  const btnStopRun = document.getElementById('btn-stop-run');
  const btnRerun = document.getElementById('btn-rerun');
  
  if (btnStopRun) {
    btnStopRun.addEventListener('click', () => App.stopRun());
    console.log('[App] Stop Run button wired');
  } else {
    console.error('[App] btn-stop-run button not found');
  }
  
  if (btnRerun) {
    btnRerun.addEventListener('click', () => App.runCurrentFile());
    console.log('[App] Rerun button wired');
  } else {
    console.error('[App] btn-rerun button not found');
  }
});

// Expose to window for other modules
window.App = App;
