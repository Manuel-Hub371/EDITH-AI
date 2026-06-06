/* ─── Editor Manager (Monaco) ─────────────────────────────────────────────── */

const EditorManager = (() => {
  const editorMain    = document.getElementById('editor-main');
  const editorWelcome = document.getElementById('editor-welcome');

  let monacoReady = false;
  let monacoEditor = null;       // The single Monaco editor instance
  let models = new Map();        // tabId -> { model, viewState }
  let currentTabId = null;

  // ─── Monaco Init ─────────────────────────────────────────────────────────

  function init() {
    return new Promise((resolve) => {
      if (typeof require === 'undefined') {
        // Monaco loader not available yet — try again shortly
        setTimeout(() => init().then(resolve), 200);
        return;
      }

      // Set Monaco environment for web workers
      window.MonacoEnvironment = {
        getWorkerUrl: function(moduleId, label) {
          return 'data:text/javascript;charset=utf-8,' + encodeURIComponent(`
            self.MonacoEnvironment = { baseUrl: '${window.location.origin}' };
            importScripts('${window.location.origin}/vendor/monaco/vs/base/worker/workerMain.js');
          `);
        }
      };

      require.config({ paths: { vs: '../vendor/monaco/vs' } });

      require(['vs/editor/editor.main'], () => {
        monacoReady = true;
        console.log('[EditorManager] Monaco loaded successfully');

        // Define NovaGen Dark theme
        monaco.editor.defineTheme('nova-dark', {
          base: 'vs-dark',
          inherit: true,
          rules: [
            { token: 'comment',    foreground: '585b70', fontStyle: 'italic' },
            { token: 'keyword',    foreground: 'cba6f7' },
            { token: 'string',     foreground: 'a6e3a1' },
            { token: 'number',     foreground: 'fab387' },
            { token: 'type',       foreground: '89dceb' },
            { token: 'class',      foreground: 'f9e2af' },
            { token: 'function',   foreground: '89b4fa' },
            { token: 'variable',   foreground: 'cdd6f4' },
            { token: 'operator',   foreground: '89dceb' },
            { token: 'parameter',  foreground: 'f38ba8' },
          ],
          colors: {
            'editor.background':           '#1e1e2e',
            'editor.foreground':           '#cdd6f4',
            'editor.lineHighlightBackground': '#2a2a3e',
            'editor.selectionBackground':  '#3d3d60',
            'editor.inactiveSelectionBackground': '#2d2d50',
            'editorLineNumber.foreground': '#45475a',
            'editorLineNumber.activeForeground': '#a6adc8',
            'editorCursor.foreground':     '#f5c2e7',
            'editor.findMatchBackground':  '#f9e2af40',
            'editor.findMatchHighlightBackground': '#f9e2af20',
            'editorWidget.background':     '#181825',
            'editorWidget.border':         '#313145',
            'editorSuggestWidget.background': '#181825',
            'editorSuggestWidget.border':  '#313145',
            'editorSuggestWidget.selectedBackground': '#313148',
            'list.hoverBackground':        '#2a2a3e',
            'list.activeSelectionBackground': '#313148',
            'scrollbarSlider.background':  '#31314580',
            'scrollbarSlider.hoverBackground': '#45475a80',
            'minimap.background':          '#181825',
          },
        });

        // Nova Light theme
        monaco.editor.defineTheme('nova-light', {
          base: 'vs',
          inherit: true,
          rules: [],
          colors: {
            'editor.background': '#eff1f5',
            'editor.foreground': '#4c4f69',
          },
        });

        // Nova Midnight theme
        monaco.editor.defineTheme('nova-midnight', {
          base: 'vs-dark',
          inherit: true,
          rules: [
            { token: 'keyword',  foreground: 'b4befe' },
            { token: 'string',   foreground: 'a6e3a1' },
            { token: 'number',   foreground: 'fab387' },
          ],
          colors: {
            'editor.background': '#0d0d1a',
            'editor.foreground': '#cdd6f4',
          },
        });

        monaco.editor.setTheme('nova-dark');

        // Create the main editor instance
        monacoEditor = monaco.editor.create(editorMain, {
          model: null,
          theme: 'nova-dark',
          fontSize: 14,
          fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
          fontLigatures: true,
          lineNumbers: 'on',
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          wordWrap: 'off',
          tabSize: 2,
          insertSpaces: true,
          smoothScrolling: true,
          cursorBlinking: 'phase',
          cursorSmoothCaretAnimation: 'on',
          renderWhitespace: 'selection',
          bracketPairColorization: { enabled: true },
          guides: { bracketPairs: true, indentation: true },
          padding: { top: 8 },
          automaticLayout: true,
          suggest: { showKeywords: true, showSnippets: true },
          quickSuggestions: { other: true, comments: false, strings: false },
          formatOnPaste: true,
          formatOnType: false,
        });

        // Track cursor position -> status bar
        monacoEditor.onDidChangeCursorPosition((e) => {
          StatusBar.setCursor(e.position.lineNumber, e.position.column);
        });

        // Track content changes -> mark dirty
        monacoEditor.onDidChangeModelContent(() => {
          if (currentTabId !== null) {
            TabManager.markDirty(currentTabId, true);
          }
        });

        // Expose globally for other modules (search, command palette, etc.)
        window.__monacoEditor = monacoEditor;

        console.log('[EditorManager] Monaco editor instance created and ready');
        resolve();
      });
    });
  }

  // ─── File Operations ──────────────────────────────────────────────────────

  async function openFile(filePath) {
    console.log(`[EditorManager] Opening file: ${filePath}`);
    
    const fileName = filePath.split(/[/\\]/).pop();
    const existingTab = TabManager.getTabByPath(filePath);

    if (existingTab) {
      console.log(`[EditorManager] File already open, activating tab ${existingTab.id}`);
      activateTab(existingTab.id, filePath);
      TabManager.setActive(existingTab.id);
      return;
    }

    // Read file content
    console.log(`[EditorManager] Reading file from disk...`);
    const result = await window.novagen.fs.readFile(filePath);
    if (!result.success) {
      console.error(`[EditorManager] Failed to read file: ${result.error}`);
      Notifications.error('Cannot Open File', result.error);
      return;
    }

    console.log(`[EditorManager] File read successfully, ${result.content.length} bytes`);

    const tabId = TabManager.openTab(filePath, fileName);
    showEditor();

    // Create Monaco model
    const langId = Utils.getLanguageId(fileName);
    console.log(`[EditorManager] Creating Monaco model with language: ${langId}`);
    
    const uri = monaco.Uri.file(filePath);
    let model = monaco.editor.getModel(uri);
    if (!model) {
      model = monaco.editor.createModel(result.content, langId, uri);
      console.log(`[EditorManager] New model created`);
    } else {
      console.log(`[EditorManager] Reusing existing model`);
    }

    models.set(tabId, { model, viewState: null });
    activateTab(tabId, filePath);

    StatusBar.setLanguage(Utils.getLanguageName(fileName));
    console.log(`[EditorManager] File opened successfully, tab ID: ${tabId}`);
  }

  function activateTab(tabId, filePath) {
    if (!monacoReady || !monacoEditor) {
      console.error(`[EditorManager] Cannot activate tab: Monaco not ready (ready=${monacoReady}, editor=${!!monacoEditor})`);
      return;
    }

    console.log(`[EditorManager] Activating tab ${tabId}`);

    // Save current view state
    if (currentTabId !== null && models.has(currentTabId)) {
      models.get(currentTabId).viewState = monacoEditor.saveViewState();
    }

    currentTabId = tabId;
    TabManager.setActive(tabId);

    const entry = models.get(tabId);
    if (!entry) {
      console.error(`[EditorManager] No model found for tab ${tabId}`);
      return;
    }

    console.log(`[EditorManager] Setting model for tab ${tabId}`);
    monacoEditor.setModel(entry.model);
    
    if (entry.viewState) {
      monacoEditor.restoreViewState(entry.viewState);
    }
    
    monacoEditor.focus();

    const fileName = filePath ? filePath.split(/[/\\]/).pop() : '';
    StatusBar.setLanguage(Utils.getLanguageName(fileName));
    showEditor();
    
    console.log(`[EditorManager] Tab ${tabId} activated successfully`);
  }

  async function saveFile(tabId) {
    const tab = TabManager.getTab(tabId);
    if (!tab) return;

    // If this is an untitled file, use Save As dialog
    if (tab.path.startsWith('untitled-')) {
      await saveAs();
      return;
    }

    const entry = models.get(tabId);
    if (!entry) return;

    const content = entry.model.getValue();
    const result = await window.novagen.fs.writeFile(tab.path, content);

    if (result.success) {
      TabManager.markDirty(tabId, false);
      Notifications.success('Saved', tab.name, 1500);
    } else {
      Notifications.error('Save Failed', result.error);
    }
  }

  async function saveCurrentFile() {
    if (currentTabId !== null) await saveFile(currentTabId);
  }

  async function saveAs() {
    const tab = TabManager.getActive();
    if (!tab) return;

    const entry = models.get(tab.id);
    if (!entry) return;

    // For untitled files, suggest a default name
    const defaultPath = tab.path.startsWith('untitled-') ? 'untitled.txt' : tab.path;
    const newPath = await window.novagen.fs.saveFileDialog(defaultPath);
    if (!newPath) return;

    const content = entry.model.getValue();
    const result = await window.novagen.fs.writeFile(newPath, content);

    if (result.success) {
      const newName = newPath.split(/[/\\]/).pop();
      
      // Update the tab with the real path
      TabManager.updateTab(tab.id, newPath, newName);
      TabManager.markDirty(tab.id, false);
      
      // Recreate the model with the new URI and language
      const langId = Utils.getLanguageId(newName);
      const uri = monaco.Uri.file(newPath);
      
      // Dispose old model
      entry.model.dispose();
      
      // Create new model with proper language
      const newModel = monaco.editor.createModel(content, langId, uri);
      models.set(tab.id, { model: newModel, viewState: null });
      monacoEditor.setModel(newModel);
      
      StatusBar.setLanguage(Utils.getLanguageName(newName));
      Notifications.success('Saved As', newName);
      
      // Refresh file tree if this file is in the workspace
      if (window.FileTree && window.FileTree.getRootPath && window.FileTree.getRootPath()) {
        const rootPath = window.FileTree.getRootPath();
        if (newPath.startsWith(rootPath)) {
          window.FileTree.refresh();
        }
      }
    } else {
      Notifications.error('Save Failed', result.error);
    }
  }

  function newFile() {
    const tabId = TabManager.openTab('untitled-' + Utils.uid(), 'untitled');
    showEditor();
    const model = monaco.editor.createModel('', 'plaintext');
    models.set(tabId, { model, viewState: null });
    activateTab(tabId, null);
  }

  function destroyTab(tabId) {
    const entry = models.get(tabId);
    if (entry) {
      entry.model.dispose();
      models.delete(tabId);
    }
    if (currentTabId === tabId) currentTabId = null;
  }

  // ─── Editor Settings ──────────────────────────────────────────────────────

  function applySettings(settings) {
    if (!monacoEditor) return;
    monacoEditor.updateOptions({
      fontSize:    settings.fontSize    || 14,
      tabSize:     settings.tabSize     || 2,
      wordWrap:    settings.wordWrap    || 'off',
      minimap:     { enabled: settings.minimap !== false },
      lineNumbers: settings.lineNumbers || 'on',
    });
    if (settings.theme) monaco.editor.setTheme(settings.theme);
  }

  function setTheme(themeId) {
    if (monacoReady) monaco.editor.setTheme(themeId);
  }

  // ─── Find / Replace ───────────────────────────────────────────────────────

  function openFind() {
    if (monacoEditor) monacoEditor.getAction('actions.find').run();
  }

  function openReplace() {
    if (monacoEditor) monacoEditor.getAction('editor.action.startFindReplaceAction').run();
  }

  // ─── UI helpers ───────────────────────────────────────────────────────────

  function showEditor() {
    editorWelcome.style.display = 'none';
    editorMain.classList.add('visible');
  }

  function showWelcome() {
    editorWelcome.style.display = '';
    editorMain.classList.remove('visible');
    currentTabId = null;
    if (monacoEditor) monacoEditor.setModel(null);
    StatusBar.setLanguage('Plain Text');
    document.getElementById('breadcrumb-path').innerHTML = '';
  }

  function getCurrentTabId() { return currentTabId; }

  function layout() {
    if (monacoEditor) monacoEditor.layout();
  }

  return {
    init,
    openFile, activateTab, saveFile, saveCurrentFile, saveAs, newFile, destroyTab,
    applySettings, setTheme,
    openFind, openReplace,
    showWelcome, showEditor, layout,
    getCurrentTabId,
  };
})();

// Expose to window for other modules
window.EditorManager = EditorManager;
