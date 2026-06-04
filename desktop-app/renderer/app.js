/* ============================================================
   EDITH IDE - Main Application Logic
   ============================================================ */

(function () {
  'use strict';

  // Wait for DOM to be fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    console.log('EDITH IDE Initialized');

    // State
    let currentFile = null;
    let openTabs = [];
    let isBottomPanelOpen = true;
    let currentWorkspaceFolder = null;

    // DOM Elements
    const activityIcons = document.querySelectorAll('.activity-icon');
    const welcomeScreen = document.getElementById('welcome-screen');
    const codeEditorContainer = document.getElementById('code-editor-container');
    const codeEditor = document.getElementById('code-editor');
    const lineNumbers = document.getElementById('line-numbers');
    const editorTabs = document.getElementById('editor-tabs');
    const terminalInput = document.getElementById('terminal-input');
    const terminal = document.getElementById('terminal');
    const bottomPanel = document.getElementById('bottom-panel');
    const btnClosePanel = document.getElementById('btn-close-panel');
    const fileTree = document.getElementById('file-tree');
    const noFolderState = document.getElementById('no-folder-state');
    const openFolderBtn = document.getElementById('open-folder-btn');
    const sidebar = document.getElementById('sidebar');
    const aiPanel = document.getElementById('ai-panel');

    // File Dropdown Menu
    const menuFile = document.getElementById('menu-file');
    const fileDropdown = document.getElementById('file-dropdown');
    const menuEdit = document.getElementById('menu-edit');
    const editDropdown = document.getElementById('edit-dropdown');
    const menuSelection = document.getElementById('menu-selection');
    const selectionDropdown = document.getElementById('selection-dropdown');
    const menuView = document.getElementById('menu-view');
    const viewDropdown = document.getElementById('view-dropdown');
    const menuRun = document.getElementById('menu-run');
    const runDropdown = document.getElementById('run-dropdown');
    const menuTerminal = document.getElementById('menu-terminal');
    const terminalDropdown = document.getElementById('terminal-dropdown');
    const menuHelp = document.getElementById('menu-help');
    const helpDropdown = document.getElementById('help-dropdown');

    // ============================================================
    // Dropdown Menu System
    // ============================================================
    const menuPairs = [
      { button: menuFile, dropdown: fileDropdown },
      { button: menuEdit, dropdown: editDropdown },
      { button: menuSelection, dropdown: selectionDropdown },
      { button: menuView, dropdown: viewDropdown },
      { button: menuRun, dropdown: runDropdown },
      { button: menuTerminal, dropdown: terminalDropdown },
      { button: menuHelp, dropdown: helpDropdown }
    ];

    function setupDropdownMenu(button, dropdown) {
      if (!button || !dropdown) return;

      button.addEventListener('click', (e) => {
        e.stopPropagation();
        const isShowing = dropdown.classList.contains('show');
        
        // Close all dropdowns
        closeAllDropdowns();

        // Toggle current dropdown
        if (!isShowing) {
          dropdown.classList.add('show');
          button.classList.add('active');
        }
      });

      // Handle dropdown item clicks
      dropdown.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const action = item.dataset.action;
          handleMenuAction(action);
          closeAllDropdowns();
        });
      });
    }

    function closeAllDropdowns() {
      document.querySelectorAll('.dropdown-menu').forEach(dd => {
        dd.classList.remove('show');
      });
      document.querySelectorAll('.menu-item').forEach(mi => {
        mi.classList.remove('active');
      });
    }

    // Setup all dropdowns
    menuPairs.forEach(({ button, dropdown }) => {
      setupDropdownMenu(button, dropdown);
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      const isMenuClick = e.target.closest('.menu-item-wrapper');
      if (!isMenuClick) {
        closeAllDropdowns();
      }
    });

    // ============================================================
    // Menu Actions Handler
    // ============================================================
    function handleMenuAction(action) {
      console.log('Menu action:', action);

      // File actions
      if (['new-file', 'new-folder', 'open-file', 'open-folder', 'close-folder',
           'save', 'save-as', 'save-all', 'close-tab', 'close-all-tabs'].includes(action)) {
        handleFileAction(action);
      }
      // Edit actions
      else if (action === 'undo') {
        document.execCommand('undo');
        appendTerminalLine('⟲ Undo');
      }
      else if (action === 'redo') {
        document.execCommand('redo');
        appendTerminalLine('⟳ Redo');
      }
      else if (action === 'cut') {
        document.execCommand('cut');
        appendTerminalLine('✂ Cut');
      }
      else if (action === 'copy') {
        document.execCommand('copy');
        appendTerminalLine('📋 Copy');
      }
      else if (action === 'paste') {
        document.execCommand('paste');
        appendTerminalLine('📋 Paste');
      }
      else if (action === 'find') {
        appendTerminalLine('🔍 Find: Feature coming soon');
      }
      else if (action === 'replace') {
        appendTerminalLine('🔄 Replace: Feature coming soon');
      }
      // Selection actions
      else if (action === 'select-all') {
        if (codeEditor) codeEditor.select();
        appendTerminalLine('✓ Selected all');
      }
      else if (action === 'select-line') {
        appendTerminalLine('✓ Line selected');
      }
      // View actions
      else if (action === 'toggle-sidebar') {
        toggleSidebar();
      }
      else if (action === 'toggle-ai-panel') {
        toggleAIPanel();
      }
      else if (action === 'toggle-terminal') {
        toggleBottomPanel();
      }
      else if (action === 'zoom-in') {
        zoomIn();
      }
      else if (action === 'zoom-out') {
        zoomOut();
      }
      else if (action === 'reset-zoom') {
        resetZoom();
      }
      // Run actions
      else if (action === 'run-file') {
        runFile();
      }
      else if (action === 'run-without-debugging') {
        runWithoutDebugging();
      }
      else if (action === 'stop') {
        stopExecution();
      }
      else if (action === 'add-configuration') {
        appendTerminalLine('⚙ Add Configuration: Feature coming soon');
      }
      // Terminal actions
      else if (action === 'new-terminal') {
        appendTerminalLine('✓ New terminal created');
      }
      else if (action === 'split-terminal') {
        appendTerminalLine('✓ Terminal split');
      }
      else if (action === 'kill-terminal') {
        appendTerminalLine('✓ Terminal killed');
      }
      else if (action === 'close-terminal') {
        if (bottomPanel) {
          bottomPanel.style.display = 'none';
          isBottomPanelOpen = false;
        }
      }
      // Help actions
      else if (action === 'welcome') {
        showWelcomeScreen();
      }
      else if (action === 'keyboard-shortcuts') {
        showKeyboardShortcuts();
      }
      else {
        console.log('Unknown action:', action);
      }
    }

    // ============================================================
    // Keyboard Shortcuts
    // ============================================================
    let currentZoom = 1.0;
    let sidebarVisible = true;

    document.addEventListener('keydown', (e) => {
      // Ctrl+N - New File
      if (e.ctrlKey && e.key === 'n' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        createNewFile();
      }
      // Ctrl+Shift+N - New Folder
      else if (e.ctrlKey && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        createNewFolder();
      }
      // Ctrl+O - Open File
      else if (e.ctrlKey && e.key === 'o' && !e.shiftKey) {
        e.preventDefault();
        openFileDialog();
      }
      // Ctrl+S - Save
      else if (e.ctrlKey && e.key === 's' && !e.shiftKey) {
        e.preventDefault();
        saveCurrentFile();
      }
      // Ctrl+Shift+S - Save As
      else if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        saveFileAs();
      }
      // Ctrl+W - Close Tab
      else if (e.ctrlKey && e.key === 'w') {
        e.preventDefault();
        closeCurrentTab();
      }
      // Ctrl+` - Toggle Terminal
      else if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        toggleBottomPanel();
      }
      // Ctrl+B - Toggle Sidebar
      else if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
      // Ctrl+Shift+A - Toggle AI Panel
      else if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        toggleAIPanel();
      }
      // Ctrl+F - Find
      else if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        appendTerminalLine('🔍 Find: Feature coming soon');
      }
      // Ctrl+H - Replace
      else if (e.ctrlKey && e.key === 'h') {
        e.preventDefault();
        appendTerminalLine('🔄 Replace: Feature coming soon');
      }
      // Ctrl+L - Select Line
      else if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        appendTerminalLine('✓ Line selected');
      }
      // Ctrl++ - Zoom In
      else if (e.ctrlKey && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        zoomIn();
      }
      // Ctrl+- - Zoom Out
      else if (e.ctrlKey && e.key === '-') {
        e.preventDefault();
        zoomOut();
      }
      // Ctrl+0 - Reset Zoom
      else if (e.ctrlKey && e.key === '0') {
        e.preventDefault();
        resetZoom();
      }
    });

    // ============================================================
    // Activity Bar Interactions
    // ============================================================
    const sidebarViews = {
      explorer: document.getElementById('explorer-view'),
      search: document.getElementById('search-view'),
      git: document.getElementById('git-view'),
      extensions: document.getElementById('extensions-view')
    };

    activityIcons.forEach(icon => {
      icon.addEventListener('click', () => {
        const view = icon.dataset.view;
        const wasActive = icon.classList.contains('active');
        
        // Handle AI panel separately (it's on the right)
        if (view === 'ai') {
          // Toggle active state for AI icon
          icon.classList.toggle('active');
          
          // Toggle AI panel
          if (aiPanel) {
            if (aiPanel.classList.contains('hidden')) {
              aiPanel.classList.remove('hidden');
              appendTerminalLine('✓ AI Assistant shown');
            } else {
              aiPanel.classList.add('hidden');
              appendTerminalLine('✓ AI Assistant hidden');
            }
          }
          return;
        }
        
        // Remove active class from all icons except AI
        activityIcons.forEach(i => {
          if (i.dataset.view !== 'ai') {
            i.classList.remove('active');
          }
        });
        
        // If the icon was already active, hide the sidebar
        if (wasActive) {
          if (sidebar) {
            sidebar.classList.add('hidden');
            appendTerminalLine(`✓ ${view.charAt(0).toUpperCase() + view.slice(1)} hidden`);
          }
        } else {
          // Show sidebar and activate the clicked icon
          if (sidebar) {
            sidebar.classList.remove('hidden');
          }
          icon.classList.add('active');
          
          // Switch sidebar view
          switchSidebarView(view);
          
          console.log('Switched to view:', view);
        }
      });
    });

    function switchSidebarView(viewName) {
      // Hide all views
      Object.values(sidebarViews).forEach(view => {
        if (view) view.classList.add('hidden');
      });

      // Show selected view
      const selectedView = sidebarViews[viewName];
      if (selectedView) {
        selectedView.classList.remove('hidden');
        
        // Update sidebar title
        const sidebarTitle = document.querySelector('.sidebar-title');
        if (sidebarTitle) {
          const titles = {
            explorer: currentWorkspaceFolder ? currentWorkspaceFolder.split(/[/\\]/).pop().toUpperCase() : 'EXPLORER',
            search: 'SEARCH',
            git: 'SOURCE CONTROL',
            extensions: 'EXTENSIONS'
          };
          sidebarTitle.textContent = titles[viewName] || 'EXPLORER';
        }

        appendTerminalLine(`✓ ${viewName.charAt(0).toUpperCase() + viewName.slice(1)} view shown`);
      }
    }

    // ============================================================
    // Welcome Screen Links
    // ============================================================
    const welcomeLinks = document.querySelectorAll('.welcome-link[data-action]');
    welcomeLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const action = link.dataset.action;
        
        if (action === 'new-file') {
          createNewFile();
        } else if (action === 'open-file') {
          openFileDialog();
        } else if (action === 'open-folder') {
          openFolder();
        }
      });
    });

    // Open Folder Button
    if (openFolderBtn) {
      openFolderBtn.addEventListener('click', () => {
        openFolder();
      });
    }

    // ============================================================
    // File Tree Interactions
    // ============================================================
    const treeItems = document.querySelectorAll('.tree-item');
    treeItems.forEach(item => {
      item.addEventListener('click', () => {
        if (!item.classList.contains('folder')) {
          const fileName = item.querySelector('span').textContent;
          openFile(fileName);
        } else {
          // Toggle folder expansion
          item.classList.toggle('expanded');
        }
      });
    });

    // ============================================================
    // File Operations
    // ============================================================
    function handleFileAction(action) {
      switch (action) {
        case 'new-file':
          createNewFile();
          break;
        case 'new-folder':
          createNewFolder();
          break;
        case 'open-file':
          openFileDialog();
          break;
        case 'open-folder':
          openFolder();
          break;
        case 'close-folder':
          closeFolder();
          break;
        case 'save':
          saveCurrentFile();
          break;
        case 'save-as':
          saveFileAs();
          break;
        case 'save-all':
          saveAllFiles();
          break;
        case 'close-tab':
          closeCurrentTab();
          break;
        case 'close-all-tabs':
          closeAllTabs();
          break;
      }
    }

    async function createNewFile(parentPath = null) {
      if (!window.electronAPI) {
        appendTerminalLine('✗ Electron API not available');
        console.error('electronAPI not available');
        return;
      }

      try {
        // Show custom input dialog
        const fileName = await showInputDialog('New File', 'Enter file name:', 'untitled.txt');
        if (!fileName) return;

        // Check if workspace is open
        const workspacePath = await window.electronAPI.getWorkspacePath();
        
        if (!workspacePath && !parentPath) {
          // No workspace open - create untitled file in memory only
          appendTerminalLine(`✓ Created new file: ${fileName} (in memory - use Ctrl+S to save)`);
          
          // Open the file in editor with empty content
          openFile(fileName, '');
          
          return;
        }

        // Workspace is open OR parentPath provided - create file on disk
        const relativePath = parentPath ? `${parentPath}/${fileName}` : fileName;

        // Create the file
        const result = await window.electronAPI.createFile(relativePath);
        
        if (result && result.success) {
          appendTerminalLine(`✓ Created new file: ${relativePath}`);
          
          // Open the file in editor
          openFile(result.path || relativePath, '');
          
          // Refresh file tree
          await refreshFileTree();
        } else {
          appendTerminalLine(`✗ Failed to create file: ${fileName}`);
        }
      } catch (error) {
        console.error('Error creating file:', error);
        appendTerminalLine(`✗ Error creating file: ${error.message}`);
      }
    }

    async function createNewFolder(parentPath = null) {
      if (!window.electronAPI) {
        appendTerminalLine('✗ Electron API not available');
        console.error('electronAPI not available');
        return;
      }

      try {
        let workspacePath = await window.electronAPI.getWorkspacePath();
        
        // If no folder is open AND no parentPath, prompt user to select one
        if (!workspacePath && !parentPath) {
          appendTerminalLine('ℹ Selecting location for new folder...');
          const result = await window.electronAPI.selectFolder();
          
          if (result.success && result.path) {
            workspacePath = result.path;
            currentWorkspaceFolder = result.path;
            
            // Update sidebar title with folder name
            const sidebarTitle = document.querySelector('.sidebar-title');
            if (sidebarTitle) {
              const folderName = result.path.split(/[/\\]/).pop();
              sidebarTitle.textContent = folderName.toUpperCase();
            }
            
            // Hide no folder state
            if (noFolderState) noFolderState.style.display = 'none';
            
            // Load and display file tree
            await refreshFileTree();
            
            appendTerminalLine(`✓ Selected location: ${result.path}`);
          } else {
            appendTerminalLine('✗ Folder creation cancelled - no location selected');
            return;
          }
        }

        // Show custom input dialog
        const folderName = await showInputDialog('New Folder', 'Enter folder name:', 'new-folder');
        if (!folderName) return;

        // Determine the path (use parentPath if provided, otherwise root)
        const relativePath = parentPath ? `${parentPath}/${folderName}` : folderName;

        // Create the folder
        const result = await window.electronAPI.createFolder(relativePath);
        
        if (result && result.success) {
          appendTerminalLine(`✓ Created new folder: ${relativePath}`);
        } else {
          appendTerminalLine(`✗ Failed to create folder: ${folderName}`);
        }
        
        // Refresh file tree
        await refreshFileTree();
      } catch (error) {
        console.error('Error creating folder:', error);
        appendTerminalLine(`✗ Error creating folder: ${error.message}`);
      }
    }

    function openFileDialog() {
      appendTerminalLine('ℹ Open File: Please use "Open Folder" (Ctrl+K Ctrl+O) first, then click files in the explorer');
    }

    async function openFolder() {
      if (!window.electronAPI) {
        appendTerminalLine('✗ Electron API not available');
        console.error('electronAPI not available');
        return;
      }

      try {
        appendTerminalLine('ℹ Opening folder dialog...');
        
        const result = await window.electronAPI.selectFolder();
        
        if (result.success && result.path) {
          currentWorkspaceFolder = result.path;
          appendTerminalLine(`✓ Opened folder: ${result.path}`);
          
          // Update sidebar title with folder name
          const sidebarTitle = document.querySelector('.sidebar-title');
          if (sidebarTitle) {
            const folderName = result.path.split(/[/\\]/).pop();
            sidebarTitle.textContent = folderName.toUpperCase();
          }
          
          // Hide no folder state
          if (noFolderState) noFolderState.style.display = 'none';
          
          // Load and display file tree
          await refreshFileTree();
        } else {
          appendTerminalLine('✗ Folder selection cancelled');
        }
      } catch (error) {
        console.error('Error opening folder:', error);
        appendTerminalLine(`✗ Error opening folder: ${error.message}`);
      }
    }

    async function closeFolder() {
      if (!window.electronAPI) {
        appendTerminalLine('✗ Electron API not available');
        console.error('electronAPI not available');
        return;
      }

      try {
        if (!currentWorkspaceFolder) {
          appendTerminalLine('ℹ No folder is currently open');
          return;
        }

        // Close the workspace
        await window.electronAPI.closeFolder();
        
        currentWorkspaceFolder = null;
        
        // Reset sidebar title
        const sidebarTitle = document.querySelector('.sidebar-title');
        if (sidebarTitle) {
          sidebarTitle.textContent = 'EXPLORER';
        }
        
        // Show no folder state
        if (noFolderState) noFolderState.style.display = 'flex';
        if (fileTree) fileTree.innerHTML = '';
        
        // Close all tabs
        closeAllTabs();
        
        appendTerminalLine('✓ Folder closed');
      } catch (error) {
        console.error('Error closing folder:', error);
        appendTerminalLine(`✗ Error closing folder: ${error.message}`);
      }
    }

    async function saveCurrentFile() {
      if (!currentFile) {
        appendTerminalLine('ℹ No file to save');
        return;
      }

      if (!window.electronAPI) {
        appendTerminalLine('✗ Electron API not available');
        console.error('electronAPI not available');
        return;
      }

      try {
        const workspacePath = await window.electronAPI.getWorkspacePath();
        const content = codeEditor ? codeEditor.value : '';
        
        // Check if this is an untitled file (not on disk yet)
        const isUntitled = !workspacePath || !currentFile.includes('/') && !currentFile.includes('\\');
        
        if (isUntitled) {
          // This is an untitled file - need to select save location
          appendTerminalLine('ℹ Selecting save location...');
          
          // Prompt user to open/select a folder if not already open
          let savePath = workspacePath;
          if (!savePath) {
            const result = await window.electronAPI.selectFolder();
            
            if (result.success && result.path) {
              savePath = result.path;
              currentWorkspaceFolder = result.path;
              
              // Update sidebar title with folder name
              const sidebarTitle = document.querySelector('.sidebar-title');
              if (sidebarTitle) {
                const folderName = result.path.split(/[/\\]/).pop();
                sidebarTitle.textContent = folderName.toUpperCase();
              }
              
              // Hide no folder state
              if (noFolderState) noFolderState.style.display = 'none';
              
              appendTerminalLine(`✓ Selected folder: ${result.path}`);
            } else {
              appendTerminalLine('✗ Save cancelled - no location selected');
              return;
            }
          }
          
          // Now save the file
          const fileName = currentFile;
          const result = await window.electronAPI.createFile(fileName);
          
          if (result && result.success) {
            await window.electronAPI.writeFile(result.path || fileName, content);
            
            // Update current file to the saved path
            currentFile = result.path || fileName;
            
            // Update tab
            const currentTab = openTabs.find(tab => tab.name === fileName);
            if (currentTab) {
              currentTab.name = currentFile;
              currentTab.content = content;
              currentTab.isDirty = false;
            }
            
            // Update tab element
            const tabElement = document.querySelector(`.tab[data-filename="${fileName}"]`);
            if (tabElement) {
              tabElement.dataset.filename = currentFile;
              tabElement.classList.remove('dirty');
              const tabName = tabElement.querySelector('.tab-name');
              if (tabName) {
                const displayName = currentFile.split(/[/\\]/).pop();
                tabName.textContent = displayName;
              }
            }
            
            appendTerminalLine(`✓ Saved: ${currentFile}`);
            
            // Refresh file tree
            await refreshFileTree();
          }
        } else {
          // File already exists on disk - just save it
          await window.electronAPI.writeFile(currentFile, content);
          
          // Update tab state
          const currentTab = openTabs.find(tab => tab.name === currentFile);
          if (currentTab) {
            currentTab.content = content;
            currentTab.isDirty = false;
          }
          
          // Remove dirty indicator from tab
          const tabElement = document.querySelector(`.tab[data-filename="${currentFile}"]`);
          if (tabElement) {
            tabElement.classList.remove('dirty');
            const tabName = tabElement.querySelector('.tab-name');
            if (tabName && tabName.textContent.startsWith('● ')) {
              tabName.textContent = tabName.textContent.substring(2);
            }
          }
          
          appendTerminalLine(`✓ Saved: ${currentFile}`);
        }
      } catch (error) {
        console.error('Error saving file:', error);
        appendTerminalLine(`✗ Error saving file: ${error.message}`);
      }
    }

    async function saveFileAs() {
      if (!window.electronAPI) {
        appendTerminalLine('✗ Electron API not available');
        console.error('electronAPI not available');
        return;
      }

      try {
        const workspacePath = await window.electronAPI.getWorkspacePath();
        
        if (!workspacePath) {
          appendTerminalLine('⚠ Please open a folder first');
          return;
        }

        // Show custom input dialog
        const currentFileName = currentFile || 'untitled.txt';
        const newFileName = await showInputDialog('Save As', 'Save as:', currentFileName);
        if (!newFileName) return;

        const content = codeEditor ? codeEditor.value : '';
        
        // Create the new file
        const result = await window.electronAPI.createFile(newFileName);
        
        if (result && result.success) {
          // Write content to the new file
          await window.electronAPI.writeFile(result.path || newFileName, content);
          
          appendTerminalLine(`✓ Saved as: ${newFileName}`);
          
          // Open the new file in editor
          openFile(result.path || newFileName, content);
          
          // Refresh file tree
          await refreshFileTree();
        } else {
          appendTerminalLine(`✗ Failed to save file as: ${newFileName}`);
        }
      } catch (error) {
        console.error('Error saving file as:', error);
        appendTerminalLine(`✗ Error: ${error.message}`);
      }
    }

    async function deleteItem(itemPath, isDirectory) {
      if (!window.electronAPI) {
        appendTerminalLine('✗ Electron API not available');
        console.error('electronAPI not available');
        return;
      }

      try {
        const itemName = itemPath.split(/[/\\]/).pop();
        const itemType = isDirectory ? 'folder' : 'file';
        
        // Show confirmation dialog
        const confirmed = await showConfirmDialog(
          `Delete ${itemType}`,
          `Are you sure you want to delete "${itemName}"?${isDirectory ? ' This will delete all contents.' : ''}`,
          'Delete',
          'Cancel'
        );
        
        if (!confirmed) return;

        // Delete the item
        const result = await window.electronAPI.deleteItem(itemPath);
        
        if (result && result.success) {
          appendTerminalLine(`✓ Deleted ${itemType}: ${itemName}`);
          
          // If it was a file and it's currently open, close the tab
          if (!isDirectory && currentFile === itemPath) {
            closeTab(itemPath);
          }
          
          // Refresh file tree
          await refreshFileTree();
        } else {
          appendTerminalLine(`✗ Failed to delete ${itemType}: ${itemName}`);
        }
      } catch (error) {
        console.error('Error deleting item:', error);
        appendTerminalLine(`✗ Error deleting: ${error.message}`);
      }
    }

    async function saveAllFiles() {
      if (openTabs.length === 0) {
        appendTerminalLine('ℹ No files to save');
        return;
      }

      try {
        let savedCount = 0;
        
        for (const tab of openTabs) {
          if (tab.isDirty) {
            await window.electronAPI.writeFile(tab.name, tab.content);
            tab.isDirty = false;
            savedCount++;
          }
        }
        
        // Remove dirty indicators from all tabs
        document.querySelectorAll('.tab.dirty').forEach(tabEl => {
          tabEl.classList.remove('dirty');
          const tabName = tabEl.querySelector('.tab-name');
          if (tabName && tabName.textContent.startsWith('● ')) {
            tabName.textContent = tabName.textContent.substring(2);
          }
        });
        
        appendTerminalLine(`✓ Saved ${savedCount} file(s)`);
      } catch (error) {
        console.error('Error saving files:', error);
        appendTerminalLine(`✗ Error saving files: ${error.message}`);
      }
    }

    function closeCurrentTab() {
      if (currentFile) {
        const tab = openTabs.find(t => t.name === currentFile);
        if (tab && tab.isDirty) {
          const shouldSave = confirm(`Save changes to ${currentFile}?`);
          if (shouldSave) {
            saveCurrentFile().then(() => {
              closeTab(currentFile);
            });
            return;
          }
        }
        closeTab(currentFile);
        appendTerminalLine(`✓ Closed: ${currentFile}`);
      } else {
        appendTerminalLine('ℹ No tab to close');
      }
    }

    function closeAllTabs() {
      if (openTabs.length === 0) {
        appendTerminalLine('ℹ No tabs to close');
        return;
      }

      // Check for unsaved changes
      const dirtyTabs = openTabs.filter(tab => tab.isDirty);
      if (dirtyTabs.length > 0) {
        const shouldSave = confirm(`Save changes to ${dirtyTabs.length} file(s)?`);
        if (shouldSave) {
          saveAllFiles().then(() => {
            performCloseAllTabs();
          });
          return;
        }
      }
      
      performCloseAllTabs();
    }

    function performCloseAllTabs() {
      const count = openTabs.length;
      openTabs = [];
      if (editorTabs) editorTabs.innerHTML = '';
      welcomeScreen.style.display = 'flex';
      codeEditorContainer.style.display = 'none';
      currentFile = null;
      appendTerminalLine(`✓ Closed ${count} tab(s)`);
    }

    // Refresh file tree from workspace
    async function refreshFileTree() {
      if (!fileTree) return;
      
      if (!window.electronAPI) {
        console.error('electronAPI not available');
        fileTree.innerHTML = '<div style="padding: 12px; color: var(--text-danger);">API not available</div>';
        return;
      }

      try {
        const files = await window.electronAPI.readDir();
        
        if (!files || files.length === 0) {
          fileTree.innerHTML = '<div style="padding: 12px; color: var(--text-secondary);">Empty folder</div>';
          return;
        }
        
        fileTree.innerHTML = '';
        renderFileTree(files, fileTree, 0); // Start at indent level 0
      } catch (error) {
        console.error('Error loading file tree:', error);
        fileTree.innerHTML = '<div style="padding: 12px; color: var(--text-danger);">Error loading files</div>';
      }
    }

    // Render file tree recursively - Proper nested structure like VS Code
    function renderFileTree(items, container, indent = 0) {
      if (!items || !container) return;
      
      items.forEach(item => {
        // Create wrapper for item and its children
        const itemWrapper = document.createElement('div');
        itemWrapper.className = 'tree-item-wrapper';
        itemWrapper.dataset.path = item.path;
        
        // Create the item itself
        const itemDiv = document.createElement('div');
        itemDiv.className = 'tree-item';
        itemDiv.style.paddingLeft = `${8 + indent * 16}px`;
        itemDiv.dataset.path = item.path;
        
        if (item.isDir) {
          // Folder item
          itemDiv.classList.add('folder');
          
          // Create expand/collapse arrow
          const arrow = document.createElement('span');
          arrow.className = 'folder-arrow';
          arrow.innerHTML = '▶';
          
          // Create folder icon
          const folderIcon = document.createElement('svg');
          folderIcon.setAttribute('width', '16');
          folderIcon.setAttribute('height', '16');
          folderIcon.setAttribute('viewBox', '0 0 24 24');
          folderIcon.setAttribute('fill', 'none');
          folderIcon.setAttribute('stroke', 'currentColor');
          folderIcon.setAttribute('stroke-width', '2');
          folderIcon.innerHTML = '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>';
          
          // Create folder name
          const folderName = document.createElement('span');
          folderName.className = 'item-name';
          folderName.textContent = item.name;
          
          itemDiv.appendChild(arrow);
          itemDiv.appendChild(folderIcon);
          itemDiv.appendChild(folderName);
          
          // Create children container
          const childrenContainer = document.createElement('div');
          childrenContainer.className = 'tree-children';
          childrenContainer.style.display = 'none'; // Start collapsed
          
          // Folder click handler
          itemDiv.addEventListener('click', (e) => {
            e.stopPropagation();
            
            const isExpanded = itemWrapper.classList.contains('expanded');
            
            if (isExpanded) {
              // Collapse
              itemWrapper.classList.remove('expanded');
              childrenContainer.style.display = 'none';
              arrow.innerHTML = '▶';
            } else {
              // Expand
              itemWrapper.classList.add('expanded');
              childrenContainer.style.display = 'block';
              arrow.innerHTML = '▼';
            }
          });
          
          // Folder context menu (right-click)
          itemDiv.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showContextMenu(e.clientX, e.clientY, item.path, true);
          });
          
          itemWrapper.appendChild(itemDiv);
          
          // Render children if they exist
          if (item.children && item.children.length > 0) {
            renderFileTree(item.children, childrenContainer, indent + 1);
            itemWrapper.appendChild(childrenContainer);
          } else {
            // No children, hide arrow
            arrow.style.visibility = 'hidden';
          }
          
        } else {
          // File item
          const icon = getFileIconHTML(item.name);
          const fileName = document.createElement('span');
          fileName.className = 'item-name';
          fileName.textContent = item.name;
          
          itemDiv.innerHTML = icon;
          itemDiv.appendChild(fileName);
          
          // File click handler
          itemDiv.addEventListener('click', async (e) => {
            e.stopPropagation();
            
            if (!window.electronAPI) {
              console.error('electronAPI not available');
              appendTerminalLine('✗ Cannot open file: API not available');
              return;
            }
            
            // Remove 'selected' class from all file items
            document.querySelectorAll('.tree-item:not(.folder)').forEach(fileItem => {
              fileItem.classList.remove('selected');
            });
            
            // Add 'selected' class to clicked item
            itemDiv.classList.add('selected');
            
            try {
              const content = await window.electronAPI.readFile(item.path);
              openFile(item.path, content);
            } catch (error) {
              console.error('Error opening file:', error);
              appendTerminalLine(`✗ Error opening ${item.name}: ${error.message}`);
            }
          });
          
          // File context menu (right-click)
          itemDiv.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showContextMenu(e.clientX, e.clientY, item.path, false);
          });
          
          itemWrapper.appendChild(itemDiv);
        }
        
        container.appendChild(itemWrapper);
      });
    }

    function getFileIconHTML(fileName) {
      const ext = fileName.split('.').pop().toLowerCase();
      
      // SVG icon colors - VS Code style
      const iconColors = {
        'js': '#f7df1e',      // JavaScript yellow
        'jsx': '#61dafb',     // React blue
        'ts': '#3178c6',      // TypeScript blue
        'tsx': '#3178c6',     // TypeScript blue
        'html': '#e34c26',    // HTML orange
        'css': '#1572b6',     // CSS blue
        'scss': '#c6538c',    // SCSS pink
        'json': '#f7df1e',    // JSON yellow
        'md': '#519aba',      // Markdown blue
        'py': '#3776ab',      // Python blue
        'java': '#e76f00',    // Java orange
        'cpp': '#00599c',     // C++ blue
        'c': '#00599c',       // C blue
        'go': '#00add8',      // Go blue
        'rs': '#ce422b',      // Rust orange
        'php': '#777bb4',     // PHP purple
        'rb': '#cc342d',      // Ruby red
        'sh': '#4eaa25',      // Shell green
        'yml': '#cb171e',     // YAML red
        'yaml': '#cb171e',    // YAML red
        'xml': '#e34c26',     // XML orange
        'sql': '#336791',     // SQL blue
        'vue': '#42b883',     // Vue green
        'txt': '#6b7394',     // Plain text gray
        'default': '#6b7394'  // Default gray
      };
      
      const color = iconColors[ext] || iconColors['default'];
      
      // Simple file icon SVG (like VS Code)
      return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="margin-right: 6px; flex-shrink: 0;">
        <path d="M9.5 1H3.5C3.10218 1 2.72064 1.15804 2.43934 1.43934C2.15804 1.72064 2 2.10218 2 2.5V13.5C2 13.8978 2.15804 14.2794 2.43934 14.5607C2.72064 14.842 3.10218 15 3.5 15H12.5C12.8978 15 13.2794 14.842 13.5607 14.5607C13.842 14.2794 14 13.8978 14 13.5V5.5L9.5 1Z" fill="${color}" opacity="0.9"/>
        <path d="M9.5 1V5.5H14" stroke="${color}" stroke-width="0.5" opacity="0.6"/>
      </svg>`;
    }

    function toggleBottomPanel() {
      if (isBottomPanelOpen) {
        bottomPanel.style.height = '0';
        bottomPanel.style.display = 'none';
        isBottomPanelOpen = false;
      } else {
        bottomPanel.style.height = '200px';
        bottomPanel.style.display = 'flex';
        isBottomPanelOpen = true;
      }
    }

    // ============================================================
    // View Operations
    // ============================================================
    function toggleSidebar() {
      if (!sidebar) return;
      
      if (sidebarVisible) {
        sidebar.classList.add('hidden');
        sidebarVisible = false;
        appendTerminalLine('✓ Sidebar hidden');
      } else {
        sidebar.classList.remove('hidden');
        sidebarVisible = true;
        appendTerminalLine('✓ Sidebar visible');
      }
    }

    function toggleAIPanel() {
      if (!aiPanel) return;
      
      const isHidden = aiPanel.classList.contains('hidden');
      
      if (isHidden) {
        aiPanel.classList.remove('hidden');
        appendTerminalLine('✓ AI Assistant shown');
      } else {
        aiPanel.classList.add('hidden');
        appendTerminalLine('✓ AI Assistant hidden');
      }
      
      // Sync with activity icon
      const aiIcon = document.querySelector('.activity-icon[data-view="ai"]');
      if (aiIcon) {
        if (isHidden) {
          aiIcon.classList.add('active');
        } else {
          aiIcon.classList.remove('active');
        }
      }
    }

    function zoomIn() {
      currentZoom += 0.1;
      applyZoom();
      appendTerminalLine(`🔍 Zoom: ${Math.round(currentZoom * 100)}%`);
    }

    function zoomOut() {
      if (currentZoom > 0.3) {
        currentZoom -= 0.1;
        applyZoom();
        appendTerminalLine(`🔍 Zoom: ${Math.round(currentZoom * 100)}%`);
      }
    }

    function resetZoom() {
      currentZoom = 1.0;
      applyZoom();
      appendTerminalLine('🔍 Zoom reset to 100%');
    }

    function applyZoom() {
      document.body.style.zoom = currentZoom;
    }

    // ============================================================
    // Run Operations
    // ============================================================
    function runFile() {
      if (currentFile) {
        appendTerminalLine(`▶ Running: ${currentFile}`);
        appendTerminalLine('ℹ Run file: Feature coming soon');
      } else {
        appendTerminalLine('ℹ No file to run');
      }
    }

    function runWithoutDebugging() {
      if (currentFile) {
        appendTerminalLine(`▶ Running without debugging: ${currentFile}`);
        appendTerminalLine('ℹ Feature coming soon');
      } else {
        appendTerminalLine('ℹ No file to run');
      }
    }

    function stopExecution() {
      appendTerminalLine('⏹ Execution stopped');
    }

    // ============================================================
    // Help Operations
    // ============================================================
    function showWelcomeScreen() {
      // Close all tabs
      closeAllTabs();
      appendTerminalLine('✓ Welcome screen displayed');
    }

    function showKeyboardShortcuts() {
      appendTerminalLine('⌨ Keyboard Shortcuts:');
      appendTerminalLine('  File: Ctrl+N, Ctrl+O, Ctrl+S, Ctrl+W');
      appendTerminalLine('  Edit: Ctrl+Z, Ctrl+Y, Ctrl+C, Ctrl+V, Ctrl+F, Ctrl+H');
      appendTerminalLine('  View: Ctrl+B, Ctrl+`, Ctrl+/-, Ctrl+0');
      appendTerminalLine('  Selection: Ctrl+A, Ctrl+L');
    }

    function openFile(fileName, content = '') {
      // Hide welcome screen, show editor
      if (welcomeScreen) welcomeScreen.style.display = 'none';
      if (codeEditorContainer) codeEditorContainer.style.display = 'flex';

      // Set current file
      currentFile = fileName;

      // Add tab if not already open
      if (!openTabs.find(tab => tab.name === fileName)) {
        addTab(fileName);
        openTabs.push({ name: fileName, content: content, isDirty: false });
      } else {
        switchToTab(fileName);
      }

      // Load content
      if (codeEditor) {
        codeEditor.value = content;
        updateLineNumbers();
        updateEditorInfo();
        updateCursorPosition();
        updateMinimapSlider();
        updateSyntaxHighlight();
      }
    }

    function addTab(fileName) {
      if (!editorTabs) return;

      // Remove active class from all tabs
      document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));

      // Create new tab
      const tab = document.createElement('div');
      tab.className = 'tab active';
      tab.dataset.filename = fileName;

      const icon = getFileIconHTML(fileName);
      const tabName = document.createElement('span');
      tabName.className = 'tab-name';
      tabName.textContent = fileName;

      const tabClose = document.createElement('div');
      tabClose.className = 'tab-close';
      tabClose.innerHTML = '×';

      tab.innerHTML = icon;
      tab.appendChild(tabName);
      tab.appendChild(tabClose);

      // Tab click handler
      tab.addEventListener('click', (e) => {
        if (!e.target.classList.contains('tab-close')) {
          switchToTab(fileName);
        }
      });

      // Close button handler
      tabClose.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Check if file has unsaved changes
        const tabData = openTabs.find(t => t.name === fileName);
        if (tabData && tabData.isDirty) {
          const shouldSave = confirm(`Save changes to ${fileName}?`);
          if (shouldSave) {
            saveCurrentFile().then(() => {
              closeTab(fileName);
            });
          } else {
            closeTab(fileName);
          }
        } else {
          closeTab(fileName);
        }
      });

      editorTabs.appendChild(tab);
    }

    function switchToTab(fileName) {
      document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.filename === fileName) {
          tab.classList.add('active');
        }
      });
      currentFile = fileName;
      
      // Load file content
      const tabData = openTabs.find(t => t.name === fileName);
      if (tabData && codeEditor) {
        // If there are unsaved changes in current buffer, update the tab data
        const previousFile = openTabs.find(t => t.name === currentFile);
        if (previousFile && codeEditor.value !== previousFile.content) {
          previousFile.content = codeEditor.value;
        }
        
        codeEditor.value = tabData.content || '';
        updateLineNumbers();
      }
    }

    function closeTab(fileName) {
      const tabs = document.querySelectorAll('.tab');
      let closedTabIndex = -1;
      
      tabs.forEach((tab, index) => {
        if (tab.dataset.filename === fileName) {
          tab.remove();
          closedTabIndex = index;
        }
      });

      openTabs = openTabs.filter(tab => tab.name !== fileName);

      // If no tabs left, show welcome screen
      if (openTabs.length === 0) {
        if (welcomeScreen) welcomeScreen.style.display = 'flex';
        if (codeEditorContainer) codeEditorContainer.style.display = 'none';
        currentFile = null;
      } else {
        // Switch to previous or next tab
        const newIndex = Math.max(0, Math.min(closedTabIndex, openTabs.length - 1));
        switchToTab(openTabs[newIndex].name);
      }
    }

    function appendTerminalLine(text) {
      if (!terminal) return;
      const line = document.createElement('div');
      line.className = 'terminal-line';
      line.textContent = text;
      const inputLine = terminal.querySelector('.terminal-input-line');
      if (inputLine) {
        terminal.insertBefore(line, inputLine);
      } else {
        terminal.appendChild(line);
      }
      // Scroll to bottom
      if (terminal.parentElement) {
        terminal.parentElement.scrollTop = terminal.parentElement.scrollHeight;
      }
    }

    function generateSampleContent(fileName) {
      const ext = fileName.split('.').pop().toLowerCase();

      if (ext === 'js') {
        return `// ${fileName}\nconsole.log('Hello from EDITH IDE');\n\nfunction example() {\n  return 'Welcome to EDITH';\n}\n`;
      } else if (ext === 'html') {
        return `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>Document</title>\n</head>\n<body>\n  <h1>Hello EDITH</h1>\n</body>\n</html>`;
      } else if (ext === 'css') {
        return `/* ${fileName} */\nbody {\n  margin: 0;\n  padding: 0;\n  font-family: Arial, sans-serif;\n}\n`;
      } else {
        return `Welcome to EDITH IDE\n\nThis is a sample file: ${fileName}`;
      }
    }

    // ============================================================
    // ============================================================
    // Code Editor
    // ============================================================
    
    // Get new DOM elements
    const editorBreadcrumb = document.getElementById('editor-breadcrumb');
    const editorLanguage = document.getElementById('editor-language');
    const editorLineCol = document.getElementById('editor-line-col');
    const syntaxHighlight = document.getElementById('syntax-highlight');
    
    codeEditor.addEventListener('input', () => {
      updateLineNumbers();
      markCurrentFileDirty();
      updateEditorInfo();
      updateSyntaxHighlight();
    });
    
    codeEditor.addEventListener('scroll', () => {
      lineNumbers.scrollTop = codeEditor.scrollTop;
      updateMinimapSlider();
      syncHighlightScroll();
    });
    
    // Track cursor position
    codeEditor.addEventListener('click', updateCursorPosition);
    codeEditor.addEventListener('keyup', updateCursorPosition);
    codeEditor.addEventListener('selectionchange', updateCursorPosition);
    
    // Sync highlight layer scroll
    function syncHighlightScroll() {
      if (syntaxHighlight && codeEditor) {
        syntaxHighlight.scrollTop = codeEditor.scrollTop;
        syntaxHighlight.scrollLeft = codeEditor.scrollLeft;
      }
    }
    
    // Syntax highlighting function
    function updateSyntaxHighlight() {
      if (!syntaxHighlight || !codeEditor || !currentFile) return;
      
      const code = codeEditor.value;
      const ext = currentFile.split('.').pop().toLowerCase();
      
      let highlighted = escapeHTML(code);
      
      // Apply syntax highlighting based on language
      if (['js', 'jsx', 'ts', 'tsx'].includes(ext)) {
        highlighted = highlightJavaScript(highlighted);
      } else if (ext === 'html') {
        highlighted = highlightHTML(highlighted);
      } else if (['css', 'scss'].includes(ext)) {
        highlighted = highlightCSS(highlighted);
      } else if (ext === 'json') {
        highlighted = highlightJSON(highlighted);
      } else if (ext === 'py') {
        highlighted = highlightPython(highlighted);
      }
      
      syntaxHighlight.innerHTML = highlighted;
      syncHighlightScroll();
    }
    
    function escapeHTML(str) {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
    
    function highlightJavaScript(code) {
      // Multi-line comments first (before single-line)
      code = code.replace(/\/\*[\s\S]*?\*\//g, '<span class="comment">$&</span>');
      
      // Single-line comments
      code = code.replace(/\/\/.*$/gm, '<span class="comment">$&</span>');
      
      // Strings (template literals, double quotes, single quotes)
      code = code.replace(/`(?:[^`\\]|\\.)*`/g, '<span class="string">$&</span>');
      code = code.replace(/"(?:[^"\\]|\\.)*"/g, '<span class="string">$&</span>');
      code = code.replace(/'(?:[^'\\]|\\.)*'/g, '<span class="string">$&</span>');
      
      // Numbers (integers, floats, hex, binary)
      code = code.replace(/\b0x[0-9a-fA-F]+\b/g, '<span class="number">$&</span>');
      code = code.replace(/\b0b[01]+\b/g, '<span class="number">$&</span>');
      code = code.replace(/\b\d+\.?\d*([eE][+-]?\d+)?\b/g, '<span class="number">$&</span>');
      
      // Booleans and special values
      code = code.replace(/\b(true|false|null|undefined|NaN|Infinity)\b/g, '<span class="boolean">$1</span>');
      
      // Keywords
      code = code.replace(/\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|new|class|extends|import|export|from|default|async|await|typeof|instanceof|void|delete|in|of|this|super|static|get|set|constructor|yield)\b/g, '<span class="keyword">$1</span>');
      
      // Built-in objects and functions
      code = code.replace(/\b(console|Array|Object|String|Number|Boolean|Date|Math|JSON|Promise|Map|Set|WeakMap|WeakSet|Symbol|BigInt|Proxy|Reflect|parseInt|parseFloat|isNaN|isFinite|encodeURI|decodeURI|eval|setTimeout|setInterval|clearTimeout|clearInterval|require)\b/g, '<span class="class-name">$1</span>');
      
      // Function calls (before function declarations)
      code = code.replace(/\b([a-zA-Z_$][\w$]*)\s*(?=\()/g, '<span class="function">$1</span>');
      
      // Class names (capitalized)
      code = code.replace(/\b([A-Z][a-zA-Z0-9_$]*)\b/g, '<span class="class-name">$1</span>');
      
      // Properties and methods after dot
      code = code.replace(/\.([a-zA-Z_$][\w$]*)/g, '.<span class="property">$1</span>');
      
      // Operators
      code = code.replace(/([+\-*/%=<>!&|^~?:])/g, '<span class="operator">$1</span>');
      
      return code;
    }
    
    function highlightHTML(code) {
      // Comments first
      code = code.replace(/&lt;!--[\s\S]*?--&gt;/g, '<span class="comment">$&</span>');
      
      // Doctype
      code = code.replace(/&lt;!DOCTYPE[^&]*&gt;/gi, '<span class="keyword">$&</span>');
      
      // Closing tags
      code = code.replace(/&lt;\/([a-zA-Z][\w-]*)\s*&gt;/g, '&lt;/<span class="tag">$1</span>&gt;');
      
      // Opening tags with attributes
      code = code.replace(/&lt;([a-zA-Z][\w-]*)([^&]*?)&gt;/g, function(match, tagName, attributes) {
        let result = '&lt;<span class="tag">' + tagName + '</span>';
        
        // Highlight attributes
        attributes = attributes.replace(/\s+([\w-]+)(?:=)?/g, ' <span class="attribute">$1</span>=');
        
        // Highlight attribute values
        attributes = attributes.replace(/=\s*(["'])([^"']*)\1/g, '=<span class="string">$1$2$1</span>');
        
        return result + attributes + '&gt;';
      });
      
      return code;
    }
    
    function highlightCSS(code) {
      // Comments
      code = code.replace(/\/\*[\s\S]*?\*\//g, '<span class="comment">$&</span>');
      
      // At-rules (@media, @import, etc.)
      code = code.replace(/@[\w-]+/g, '<span class="keyword">$&</span>');
      
      // Selectors (improved)
      code = code.replace(/([.#][\w-]+)/g, '<span class="tag">$1</span>');
      code = code.replace(/^([\w-]+)(?=\s*\{)/gm, '<span class="tag">$1</span>');
      
      // Pseudo-classes and pseudo-elements
      code = code.replace(/::([\w-]+)/g, '::<span class="attribute">$1</span>');
      code = code.replace(/:([\w-]+)/g, ':<span class="attribute">$1</span>');
      
      // Property names
      code = code.replace(/\b([\w-]+)\s*:/g, '<span class="property">$1</span>:');
      
      // Color values
      code = code.replace(/#([0-9a-fA-F]{3,8})\b/g, '<span class="number">#$1</span>');
      
      // Numbers with units
      code = code.replace(/\b(\d+\.?\d*)(px|em|rem|%|vh|vw|vmin|vmax|ex|ch|cm|mm|in|pt|pc|deg|rad|turn|s|ms|fr)?\b/g, '<span class="number">$1$2</span>');
      
      // CSS functions
      code = code.replace(/\b(rgb|rgba|hsl|hsla|url|calc|var|linear-gradient|radial-gradient|repeating-linear-gradient|repeating-radial-gradient|translate|rotate|scale|skew|matrix)\s*\(/g, '<span class="function">$1</span>(');
      
      // Strings
      code = code.replace(/(["'])(?:[^"'\\]|\\.)*?\1/g, '<span class="string">$&</span>');
      
      // Important
      code = code.replace(/!important\b/g, '<span class="keyword">$&</span>');
      
      return code;
    }
    
    function highlightJSON(code) {
      // Null, booleans first
      code = code.replace(/\b(true|false|null)\b/g, '<span class="boolean">$1</span>');
      
      // Numbers
      code = code.replace(/:\s*(-?\d+\.?\d*([eE][+-]?\d+)?)/g, ': <span class="number">$1</span>');
      
      // Property keys
      code = code.replace(/"([^"]+)"\s*:/g, '<span class="property">"$1"</span>:');
      
      // String values
      code = code.replace(/:\s*"([^"]*)"/g, ': <span class="string">"$1"</span>');
      
      return code;
    }
    
    function highlightPython(code) {
      // Multi-line strings (docstrings)
      code = code.replace(/"""[\s\S]*?"""/g, '<span class="string">$&</span>');
      code = code.replace(/'''[\s\S]*?'''/g, '<span class="string">$&</span>');
      
      // Comments
      code = code.replace(/#.*$/gm, '<span class="comment">$&</span>');
      
      // Strings
      code = code.replace(/f?r?(["'])(?:[^"'\\]|\\.)*?\1/g, '<span class="string">$&</span>');
      
      // Numbers
      code = code.replace(/\b\d+\.?\d*([eE][+-]?\d+)?\b/g, '<span class="number">$&</span>');
      
      // Special values
      code = code.replace(/\b(True|False|None)\b/g, '<span class="boolean">$1</span>');
      
      // Keywords
      code = code.replace(/\b(def|class|import|from|return|if|elif|else|for|while|try|except|finally|with|as|pass|break|continue|lambda|yield|async|await|raise|assert|global|nonlocal|del|and|or|not|is|in)\b/g, '<span class="keyword">$1</span>');
      
      // Built-in functions
      code = code.replace(/\b(print|len|range|str|int|float|list|dict|set|tuple|bool|type|isinstance|hasattr|getattr|setattr|dir|help|enumerate|zip|map|filter|sorted|sum|min|max|abs|round|open|input)\b/g, '<span class="class-name">$1</span>');
      
      // Function definitions
      code = code.replace(/\bdef\s+([a-zA-Z_]\w*)/g, 'def <span class="function">$1</span>');
      
      // Class definitions
      code = code.replace(/\bclass\s+([a-zA-Z_]\w*)/g, 'class <span class="class-name">$1</span>');
      
      // Decorators
      code = code.replace(/@([a-zA-Z_]\w*)/g, '<span class="keyword">@</span><span class="function">$1</span>');
      
      return code;
    }

    function updateCursorPosition() {
      if (!codeEditor) return;
      
      const cursorPos = codeEditor.selectionStart;
      const textBeforeCursor = codeEditor.value.substring(0, cursorPos);
      const lines = textBeforeCursor.split('\n');
      const lineNumber = lines.length;
      const columnNumber = lines[lines.length - 1].length + 1;
      
      if (editorLineCol) {
        editorLineCol.textContent = `Ln ${lineNumber}, Col ${columnNumber}`;
      }
    }
    
    function updateEditorInfo() {
      updateCursorPosition();
      
      // Update language based on file extension
      if (currentFile && editorLanguage) {
        const ext = currentFile.split('.').pop().toLowerCase();
        const languageMap = {
          'js': 'JavaScript',
          'jsx': 'JavaScript React',
          'ts': 'TypeScript',
          'tsx': 'TypeScript React',
          'html': 'HTML',
          'css': 'CSS',
          'scss': 'SCSS',
          'json': 'JSON',
          'md': 'Markdown',
          'py': 'Python',
          'java': 'Java',
          'cpp': 'C++',
          'c': 'C',
          'go': 'Go',
          'rs': 'Rust',
          'php': 'PHP',
          'rb': 'Ruby',
          'sh': 'Shell',
          'yml': 'YAML',
          'yaml': 'YAML',
          'xml': 'XML',
          'sql': 'SQL',
          'txt': 'Plain Text'
        };
        editorLanguage.textContent = languageMap[ext] || 'Plain Text';
      }
      
      // Update breadcrumb
      if (currentFile && editorBreadcrumb) {
        const fileName = currentFile.split(/[/\\]/).pop();
        editorBreadcrumb.innerHTML = `<span class="breadcrumb-item" title="${currentFile}">${fileName}</span>`;
      }
    }
    
    function updateMinimapSlider() {
      const minimapSlider = document.querySelector('.minimap-slider');
      if (!minimapSlider || !codeEditor) return;
      
      const scrollPercentage = codeEditor.scrollTop / (codeEditor.scrollHeight - codeEditor.clientHeight || 1);
      const minimap = document.getElementById('editor-minimap');
      if (minimap) {
        const sliderHeight = 60;
        const maxTop = minimap.clientHeight - sliderHeight;
        minimapSlider.style.top = `${scrollPercentage * maxTop}px`;
      }
    }

    function markCurrentFileDirty() {
      if (!currentFile) return;

      const tabData = openTabs.find(tab => tab.name === currentFile);
      if (tabData) {
        const currentContent = codeEditor ? codeEditor.value : '';
        const isChanged = currentContent !== tabData.content;
        
        if (isChanged && !tabData.isDirty) {
          tabData.isDirty = true;
          
          // Add dirty indicator to tab
          const tabElement = document.querySelector(`.tab[data-filename="${currentFile}"]`);
          if (tabElement) {
            tabElement.classList.add('dirty');
            const tabName = tabElement.querySelector('.tab-name');
            if (tabName && !tabName.textContent.startsWith('● ')) {
              tabName.textContent = '● ' + tabName.textContent;
            }
          }
        }
      }
    }

    function updateLineNumbers() {
      const lines = codeEditor.value.split('\n').length;
      let numbers = '';
      for (let i = 1; i <= lines; i++) {
        numbers += i + '\n';
      }
      lineNumbers.textContent = numbers;
    }

    // ============================================================
    // Terminal
    // ============================================================
    terminalInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const command = terminalInput.value.trim();
        if (command) {
          executeCommand(command);
          terminalInput.value = '';
        }
      }
    });

    function executeCommand(command) {
      // Add command to terminal
      const commandLine = document.createElement('div');
      commandLine.className = 'terminal-line';
      commandLine.textContent = '$ ' + command;
      terminal.insertBefore(commandLine, terminal.querySelector('.terminal-input-line'));

      // Execute command
      let output = '';
      if (command === 'help') {
        output = 'Available commands: help, clear, echo, date, version';
      } else if (command === 'clear') {
        terminal.innerHTML = '';
        const inputLine = document.createElement('div');
        inputLine.className = 'terminal-input-line';
        inputLine.innerHTML = '<span class="terminal-prompt">$</span><input type="text" class="terminal-input" id="terminal-input" placeholder="Enter command...">';
        terminal.appendChild(inputLine);

        // Reattach event listener
        const newInput = document.getElementById('terminal-input');
        newInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            const cmd = newInput.value.trim();
            if (cmd) {
              executeCommand(cmd);
              newInput.value = '';
            }
          }
        });
        newInput.focus();
        return;
      } else if (command.startsWith('echo ')) {
        output = command.substring(5);
      } else if (command === 'date') {
        output = new Date().toString();
      } else if (command === 'version') {
        output = 'EDITH IDE v1.0.0';
      } else {
        output = `Command not found: ${command}`;
      }

      const outputLine = document.createElement('div');
      outputLine.className = 'terminal-line';
      outputLine.textContent = output;
      terminal.insertBefore(outputLine, terminal.querySelector('.terminal-input-line'));

      // Scroll to bottom
      terminal.parentElement.scrollTop = terminal.parentElement.scrollHeight;
    }

    // ============================================================
    // Panel Controls
    // ============================================================
    if (btnClosePanel) {
      btnClosePanel.addEventListener('click', () => {
        toggleBottomPanel();
      });
    }

    // ============================================================
    // Window Controls (Frameless Window)
    // ============================================================
    const btnMinimize = document.getElementById('btn-minimize');
    const btnMaximize = document.getElementById('btn-maximize');
    const btnClose = document.getElementById('btn-close');
    let isMaximized = false;

    function updateMaximizeButton(maximized) {
      isMaximized = maximized;
      if (!btnMaximize) return;

      btnMaximize.title = maximized ? 'Restore' : 'Maximize';
      btnMaximize.setAttribute('aria-label', maximized ? 'Restore window' : 'Maximize window');
      btnMaximize.innerHTML = maximized
        ? '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 3h6v5H1V3zm1-1h6v5H2V2zm1 1v1h4V3H3z" fill="none" stroke="currentColor" stroke-width="1"/></svg>'
        : '<svg width="10" height="10" viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" stroke="currentColor" fill="none" stroke-width="1"/></svg>';
    }

    if (btnMinimize) {
      btnMinimize.addEventListener('click', () => {
        if (window.electronAPI) window.electronAPI.minimizeWindow();
      });
    }

    if (btnMaximize) {
      btnMaximize.addEventListener('click', () => {
        if (window.electronAPI) window.electronAPI.maximizeWindow();
      });
    }

    if (btnClose) {
      btnClose.addEventListener('click', () => {
        if (window.electronAPI) window.electronAPI.closeWindow();
      });
    }

    if (window.electronAPI) {
      if (window.electronAPI.onWindowStateChanged) {
        window.electronAPI.onWindowStateChanged((state) => {
          updateMaximizeButton(state === 'maximized');
        });
      }
      if (window.electronAPI.isWindowMaximized) {
        window.electronAPI.isWindowMaximized()
          .then((maximized) => updateMaximizeButton(!!maximized))
          .catch(() => updateMaximizeButton(false));
      }
    }

    // ============================================================
    // Backend Connection Check
    // ============================================================
    async function checkBackendStatus() {
      try {
        const isOnline = await EDITH_API.checkHealth();
        console.log('Backend status:', isOnline ? 'Online' : 'Offline');

        // Could show status in status bar or UI
        if (isOnline) {
          appendTerminalLine('✓ Backend connection established');
        } else {
          appendTerminalLine('✗ Backend offline');
        }
      } catch (e) {
        console.error('Backend check failed:', e);
        appendTerminalLine('✗ Backend connection failed');
      }
    }

    // Initialize
    checkBackendStatus();

    // Focus terminal input
    if (terminalInput) terminalInput.focus();

    // ============================================================
    // Custom Input Dialog (replaces prompt())
    // ============================================================
    function showInputDialog(title, message, defaultValue = '') {
      return new Promise((resolve) => {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'input-dialog-overlay';
        
        // Create dialog
        const dialog = document.createElement('div');
        dialog.className = 'input-dialog';
        
        // Dialog HTML
        dialog.innerHTML = `
          <div class="input-dialog-header">
            <span class="input-dialog-title">${title}</span>
          </div>
          <div class="input-dialog-body">
            <label class="input-dialog-label">${message}</label>
            <input type="text" class="input-dialog-input" value="${defaultValue}" />
          </div>
          <div class="input-dialog-footer">
            <button class="input-dialog-btn input-dialog-btn-cancel">Cancel</button>
            <button class="input-dialog-btn input-dialog-btn-ok">OK</button>
          </div>
        `;
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        const input = dialog.querySelector('.input-dialog-input');
        const okBtn = dialog.querySelector('.input-dialog-btn-ok');
        const cancelBtn = dialog.querySelector('.input-dialog-btn-cancel');
        
        // Focus and select input
        setTimeout(() => {
          input.focus();
          input.select();
        }, 50);
        
        // Handle OK button
        const handleOk = () => {
          const value = input.value.trim();
          document.body.removeChild(overlay);
          resolve(value || null);
        };
        
        // Handle Cancel button
        const handleCancel = () => {
          document.body.removeChild(overlay);
          resolve(null);
        };
        
        okBtn.addEventListener('click', handleOk);
        cancelBtn.addEventListener('click', handleCancel);
        
        // Enter key submits
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleOk();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
          }
        });
        
        // Click overlay to cancel
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) {
            handleCancel();
          }
        });
      });
    }

    // ============================================================
    // Custom Confirm Dialog
    // ============================================================
    function showConfirmDialog(title, message, confirmText = 'OK', cancelText = 'Cancel') {
      return new Promise((resolve) => {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'input-dialog-overlay';
        
        // Create dialog
        const dialog = document.createElement('div');
        dialog.className = 'input-dialog confirm-dialog';
        
        // Dialog HTML
        dialog.innerHTML = `
          <div class="input-dialog-header">
            <span class="input-dialog-title">${title}</span>
          </div>
          <div class="input-dialog-body">
            <p class="confirm-dialog-message">${message}</p>
          </div>
          <div class="input-dialog-footer">
            <button class="input-dialog-btn input-dialog-btn-cancel">${cancelText}</button>
            <button class="input-dialog-btn input-dialog-btn-ok input-dialog-btn-danger">${confirmText}</button>
          </div>
        `;
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        const okBtn = dialog.querySelector('.input-dialog-btn-ok');
        const cancelBtn = dialog.querySelector('.input-dialog-btn-cancel');
        
        // Handle OK button
        const handleOk = () => {
          document.body.removeChild(overlay);
          resolve(true);
        };
        
        // Handle Cancel button
        const handleCancel = () => {
          document.body.removeChild(overlay);
          resolve(false);
        };
        
        okBtn.addEventListener('click', handleOk);
        cancelBtn.addEventListener('click', handleCancel);
        
        // Escape key cancels
        const handleKeyDown = (e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
            document.removeEventListener('keydown', handleKeyDown);
          }
        };
        document.addEventListener('keydown', handleKeyDown);
        
        // Click overlay to cancel
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) {
            handleCancel();
          }
        });
      });
    }

    // ============================================================
    // Search View Functionality
    // ============================================================
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');

    if (searchInput) {
      searchInput.addEventListener('input', async (e) => {
        const query = e.target.value.trim();
        
        if (!query) {
          searchResults.innerHTML = `
            <div class="empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <p>Search for files and text</p>
            </div>
          `;
          return;
        }

        searchResults.innerHTML = `
          <div class="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <p>Search functionality coming soon...</p>
            <p style="font-size: 11px; color: var(--text-dim); margin-top: 8px;">Searching for: "${query}"</p>
          </div>
        `;
      });
    }

    // ============================================================
    // Git View Functionality
    // ============================================================
    const initRepoBtn = document.getElementById('init-repo-btn');

    if (initRepoBtn) {
      initRepoBtn.addEventListener('click', () => {
        appendTerminalLine('ℹ Git repository initialization coming soon...');
      });
    }

    // ============================================================
    // Extensions View Functionality
    // ============================================================
    const extensionsSearch = document.getElementById('extensions-search');

    if (extensionsSearch) {
      extensionsSearch.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const extensionItems = document.querySelectorAll('.extension-item');
        
        extensionItems.forEach(item => {
          const name = item.querySelector('.extension-name').textContent.toLowerCase();
          const description = item.querySelector('.extension-description').textContent.toLowerCase();
          
          if (name.includes(query) || description.includes(query)) {
            item.style.display = 'flex';
          } else {
            item.style.display = 'none';
          }
        });
      });
    }

    // Extension install buttons
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('extension-install-btn')) {
        const extensionName = e.target.closest('.extension-item').querySelector('.extension-name').textContent;
        e.target.textContent = 'Installing...';
        e.target.disabled = true;
        
        setTimeout(() => {
          e.target.textContent = 'Installed';
          e.target.style.background = 'var(--accent-green)';
          appendTerminalLine(`✓ Installed extension: ${extensionName}`);
          
          setTimeout(() => {
            e.target.textContent = 'Uninstall';
            e.target.disabled = false;
            e.target.style.background = '';
          }, 1500);
        }, 1500);
      }
    });

    // ============================================================
    // Resizable Panels
    // ============================================================
    
    // AI Panel Resize Only
    let isResizingAI = false;
    let aiStartWidth = 0;
    let aiStartX = 0;

    if (aiPanel) {
      console.log('Creating AI panel resize handle');
      // Create resize handle
      const aiResizeHandle = document.createElement('div');
      aiResizeHandle.className = 'resize-handle resize-handle-left';
      aiResizeHandle.style.cssText = `
        position: absolute; 
        top: 0; 
        bottom: 0; 
        left: -6px; 
        width: 12px; 
        cursor: col-resize; 
        z-index: 10000; 
        background: rgba(139, 92, 246, 0.3);
        pointer-events: auto;
      `;
      aiPanel.insertBefore(aiResizeHandle, aiPanel.firstChild);
      console.log('AI panel resize handle created and inserted');

      aiResizeHandle.addEventListener('mousedown', (e) => {
        console.log('AI panel resize mousedown');
        isResizingAI = true;
        aiStartWidth = aiPanel.offsetWidth;
        aiStartX = e.clientX;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
        e.stopPropagation();
      });
      
      aiResizeHandle.addEventListener('mouseenter', () => {
        console.log('AI panel resize handle hovered');
        aiResizeHandle.style.background = 'rgba(139, 92, 246, 0.6)';
      });
      
      aiResizeHandle.addEventListener('mouseleave', () => {
        aiResizeHandle.style.background = 'rgba(139, 92, 246, 0.3)';
      });
    } else {
      console.log('AI panel element not found');
    }

    // Global mouse move handler
    document.addEventListener('mousemove', (e) => {
      if (isResizingAI && aiPanel) {
        const delta = aiStartX - e.clientX;
        const newWidth = Math.max(300, Math.min(800, aiStartWidth + delta));
        aiPanel.style.width = `${newWidth}px`;
      }
    });

    // Global mouse up handler
    document.addEventListener('mouseup', () => {
      if (isResizingAI) {
        console.log('AI panel resize ended');
        isResizingAI = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    });

    // ============================================================
    // AI Assistant Panel
    // ============================================================
    const aiInput = document.getElementById('ai-input');
    const aiSendBtn = document.getElementById('ai-send-btn');
    const aiChatContainer = document.getElementById('ai-chat-container');
    const btnToggleAI = document.getElementById('btn-toggle-ai');
    const btnClearChat = document.getElementById('btn-clear-chat');

    let aiChatHistory = [];

    // Toggle AI Panel
    if (btnToggleAI) {
      btnToggleAI.addEventListener('click', () => {
        if (aiPanel) {
          const isHidden = aiPanel.classList.contains('hidden');
          
          if (isHidden) {
            aiPanel.classList.remove('hidden');
            appendTerminalLine('✓ AI panel shown');
          } else {
            aiPanel.classList.add('hidden');
            appendTerminalLine('✓ AI panel hidden');
          }
          
          // Sync with activity icon
          const aiIcon = document.querySelector('.activity-icon[data-view="ai"]');
          if (aiIcon) {
            if (isHidden) {
              aiIcon.classList.add('active');
            } else {
              aiIcon.classList.remove('active');
            }
          }
        }
      });
    }

    // Clear Chat
    if (btnClearChat) {
      btnClearChat.addEventListener('click', () => {
        aiChatHistory = [];
        if (aiChatContainer) {
          aiChatContainer.innerHTML = `
            <div class="ai-welcome-message">
              <div class="ai-avatar">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
              </div>
              <div class="ai-welcome-text">
                <h3>Welcome to EDITH AI Assistant</h3>
                <p>I can help you with:</p>
                <ul>
                  <li>Code generation and refactoring</li>
                  <li>Debugging and error fixes</li>
                  <li>Explaining code concepts</li>
                  <li>Answering technical questions</li>
                </ul>
                <p class="ai-welcome-hint">Type your question below to get started!</p>
              </div>
            </div>
          `;
        }
        appendTerminalLine('✓ AI chat cleared');
      });
    }

    // Workspace Mode Switching - Normal vs Agent Mode
    const tabNormalMode = document.getElementById('tab-normal-mode');
    const tabNormalMode2 = document.getElementById('tab-normal-mode-2');
    const tabAgentMode1 = document.getElementById('tab-agent-mode-1');
    const tabAgentMode2 = document.getElementById('tab-agent-mode');
    const normalWorkspace = document.getElementById('normal-workspace');
    const agentWorkspace = document.getElementById('agent-workspace');
    
    // Initialize - Start in Normal mode
    function initializeWorkspace() {
      const titlebarMenu = document.querySelector('.titlebar-menu');
      const titlebarSearch = document.querySelector('.titlebar-search');
      const titlebarRight = document.querySelector('.titlebar-right');
      
      // Hide IDE menus on startup (Normal mode is default)
      if (titlebarMenu) titlebarMenu.style.display = 'none';
      if (titlebarSearch) titlebarSearch.style.display = 'none';
      if (titlebarRight) titlebarRight.style.display = 'none';
      
      console.log('✓ Initialized in Normal mode');
    }
    
    // Call initialization
    initializeWorkspace();
    
    function switchToNormalMode() {
      console.log('Switching to Normal mode workspace');
      if (normalWorkspace && agentWorkspace) {
        normalWorkspace.style.display = 'flex';
        agentWorkspace.style.display = 'none';
        
        // Hide IDE menu items from titlebar
        const titlebarMenu = document.querySelector('.titlebar-menu');
        const titlebarSearch = document.querySelector('.titlebar-search');
        const titlebarRight = document.querySelector('.titlebar-right');
        if (titlebarMenu) titlebarMenu.style.display = 'none';
        if (titlebarSearch) titlebarSearch.style.display = 'none';
        if (titlebarRight) titlebarRight.style.display = 'none';
        
        // Update tab states
        if (tabNormalMode) tabNormalMode.classList.add('active');
        if (tabNormalMode2) tabNormalMode2.classList.add('active');
        if (tabAgentMode1) tabAgentMode1.classList.remove('active');
        if (tabAgentMode2) tabAgentMode2.classList.remove('active');
        
        console.log('✓ Switched to Normal mode workspace');
      } else {
        console.error('Workspace elements not found', { normalWorkspace, agentWorkspace });
      }
    }
    
    function switchToAgentMode() {
      console.log('Switching to Agent mode workspace');
      if (normalWorkspace && agentWorkspace) {
        normalWorkspace.style.display = 'none';
        agentWorkspace.style.display = 'flex';
        
        // Show IDE menu items in titlebar
        const titlebarMenu = document.querySelector('.titlebar-menu');
        const titlebarSearch = document.querySelector('.titlebar-search');
        const titlebarRight = document.querySelector('.titlebar-right');
        if (titlebarMenu) titlebarMenu.style.display = 'flex';
        if (titlebarSearch) titlebarSearch.style.display = 'flex';
        if (titlebarRight) titlebarRight.style.display = 'flex';
        
        // Update tab states
        if (tabNormalMode) tabNormalMode.classList.remove('active');
        if (tabNormalMode2) tabNormalMode2.classList.remove('active');
        if (tabAgentMode1) tabAgentMode1.classList.add('active');
        if (tabAgentMode2) tabAgentMode2.classList.add('active');
        
        console.log('✓ Switched to Agent mode workspace');
      } else {
        console.error('Workspace elements not found', { normalWorkspace, agentWorkspace });
      }
    }
    
    // Normal Mode tab (in normal workspace)
    if (tabNormalMode) {
      tabNormalMode.addEventListener('click', switchToNormalMode);
      console.log('Normal mode tab 1 listener attached');
    }
    
    // Normal Mode tab (in IDE AI panel)
    if (tabNormalMode2) {
      tabNormalMode2.addEventListener('click', switchToNormalMode);
      console.log('Normal mode tab 2 listener attached');
    }
    
    // Agent Mode tab (in normal workspace)
    if (tabAgentMode1) {
      tabAgentMode1.addEventListener('click', switchToAgentMode);
      console.log('Agent mode tab 1 listener attached');
    }
    
    // Agent Mode tab (in IDE AI panel)
    if (tabAgentMode2) {
      tabAgentMode2.addEventListener('click', switchToAgentMode);
      console.log('Agent mode tab 2 listener attached');
    }

    // ============================================================
    // Normal Mode Functionality
    // ============================================================
    
    const normalMainInput = document.getElementById('normal-main-input');
    const normalSendBtn = document.getElementById('normal-send-btn-new');
    const normalContent = document.getElementById('normal-content');
    const normalNewChatBtn = document.querySelector('.normal-new-chat-btn');
    const normalVoiceBtn = document.getElementById('normal-voice-btn');
    const normalChatsList = document.getElementById('normal-chats-list');
    
    let normalChatMessages = [];
    let isNormalChatActive = false;
    let currentChatId = null;
    let savedChats = {}; // Store all chats: { chatId: { title, messages, timestamp } }
    
    // Generate chat title from first message
    function generateChatTitle(message) {
      return message.length > 30 ? message.substring(0, 30) + '...' : message;
    }
    
    // Save current chat
    function saveCurrentChat() {
      if (currentChatId && normalChatMessages.length > 0) {
        savedChats[currentChatId] = {
          title: savedChats[currentChatId]?.title || generateChatTitle(normalChatMessages[0].content),
          messages: [...normalChatMessages],
          timestamp: Date.now()
        };
        console.log('Chat saved:', currentChatId);
      }
    }
    
    // Load chat from history
    function loadChat(chatId) {
      const chat = savedChats[chatId];
      if (!chat) return;
      
      console.log('Loading chat:', chatId);
      currentChatId = chatId;
      normalChatMessages = [...chat.messages];
      isNormalChatActive = true;
      
      // Hide quick actions
      const quickActions = document.querySelector('.normal-quick-actions');
      if (quickActions) quickActions.style.display = 'none';
      
      // Create chat area
      normalContent.innerHTML = `
        <div class="normal-chat-messages" id="normal-chat-messages-area">
          <div class="normal-messages-container" id="normal-messages-container"></div>
        </div>
      `;
      const messagesContainer = document.getElementById('normal-messages-container');
      
      // Render all messages
      chat.messages.forEach(msg => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `normal-message ${msg.role === 'user' ? 'user' : 'assistant'}`;
        messageDiv.innerHTML = `
          <div class="normal-message-avatar">${msg.role === 'user' ? 'U' : 'E'}</div>
          <div class="normal-message-content">
            <div class="normal-message-bubble">
              <div class="normal-message-text">${msg.content}</div>
            </div>
            <div class="normal-message-time">${msg.time || new Date().toLocaleTimeString()}</div>
          </div>
        `;
        messagesContainer.appendChild(messageDiv);
      });
      
      const chatArea = document.getElementById('normal-chat-messages-area');
      chatArea.scrollTop = chatArea.scrollHeight;
      
      // Update active state in sidebar
      updateChatListUI();
    }
    
    // Update chat list UI
    function updateChatListUI() {
      if (!normalChatsList) return;
      
      normalChatsList.innerHTML = '';
      
      // Sort by timestamp (newest first)
      const sortedChats = Object.entries(savedChats).sort((a, b) => b[1].timestamp - a[1].timestamp);
      
      if (sortedChats.length === 0) {
        normalChatsList.innerHTML = '<div style="padding: 12px; color: var(--text-dim); font-size: 12px; text-align: center;">No chats yet</div>';
        return;
      }
      
      sortedChats.forEach(([chatId, chat]) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'normal-chat-item-wrapper';
        
        const chatBtn = document.createElement('button');
        chatBtn.className = 'normal-chat-item';
        if (chatId === currentChatId) chatBtn.classList.add('active');
        chatBtn.textContent = chat.title;
        chatBtn.onclick = () => loadChat(chatId);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'normal-chat-delete';
        deleteBtn.title = 'Delete chat';
        deleteBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        `;
        deleteBtn.onclick = (e) => {
          e.stopPropagation();
          showConfirmDialog(
            'Delete Chat',
            `Are you sure you want to delete "${chat.title}"? This action cannot be undone.`,
            { type: 'danger', confirmText: 'Delete', cancelText: 'Cancel' }
          ).then((confirmed) => {
            if (confirmed) {
              delete savedChats[chatId];
              if (currentChatId === chatId) {
                startNewChat();
              }
              updateChatListUI();
              console.log('Deleted chat:', chatId);
            }
          });
        };
        
        wrapper.appendChild(chatBtn);
        wrapper.appendChild(deleteBtn);
        normalChatsList.appendChild(wrapper);
      });
    }
    
    // Start new chat
    function startNewChat() {
      // Save current chat before starting new one
      saveCurrentChat();
      
      console.log('Starting new chat');
      currentChatId = 'chat_' + Date.now();
      normalChatMessages = [];
      isNormalChatActive = false;
      
      // Reset to welcome screen
      if (normalContent) {
        normalContent.innerHTML = `
          <div class="normal-welcome-state">
            <div class="normal-orb">
              <div class="normal-orb-inner"></div>
              <div class="normal-orb-glow"></div>
            </div>
            <h2 class="normal-welcome-title">WELCOME BACK SIR</h2>
            <p class="normal-welcome-subtitle">I am ready to assist you today sir</p>
          </div>
        `;
      }
      
      // Show quick action cards again
      const quickActions = document.querySelector('.normal-quick-actions');
      if (quickActions) {
        quickActions.style.display = 'grid';
      }
      
      // Clear input
      if (normalMainInput) normalMainInput.value = '';
      
      // Update UI
      updateChatListUI();
    }
    
    // New Chat Button
    if (normalNewChatBtn) {
      normalNewChatBtn.addEventListener('click', startNewChat);
    }
    
    // Send Message Function
    async function sendNormalMessage() {
      if (!normalMainInput || !normalContent) return;
      
      const message = normalMainInput.value.trim();
      if (!message) return;
      
      console.log('Sending normal mode message:', message);
      
      // If first message, switch to chat view
      if (!isNormalChatActive) {
        isNormalChatActive = true;
        normalContent.innerHTML = `
          <div class="normal-chat-messages" id="normal-chat-messages-area">
            <div class="normal-messages-container" id="normal-messages-container"></div>
          </div>
        `;
        
        // Hide quick action cards when chat starts
        const quickActions = document.querySelector('.normal-quick-actions');
        if (quickActions) {
          quickActions.style.display = 'none';
        }
      }
      
      const messagesContainer = document.getElementById('normal-messages-container');
      const chatArea = document.getElementById('normal-chat-messages-area');
      if (!messagesContainer || !chatArea) return;
      
      const currentTime = new Date().toLocaleTimeString();
      
      // Add user message
      const userMsg = document.createElement('div');
      userMsg.className = 'normal-message user';
      userMsg.innerHTML = `
        <div class="normal-message-avatar">U</div>
        <div class="normal-message-content">
          <div class="normal-message-bubble">
            <div class="normal-message-text">${message}</div>
          </div>
          <div class="normal-message-time">${currentTime}</div>
        </div>
      `;
      messagesContainer.appendChild(userMsg);
      
      // Save user message to history
      normalChatMessages.push({ role: 'user', content: message, time: currentTime });
      
      // Clear input
      normalMainInput.value = '';
      
      // Scroll to bottom
      chatArea.scrollTop = chatArea.scrollHeight;
      
      // Add loading indicator
      const loadingMsg = document.createElement('div');
      loadingMsg.className = 'normal-message assistant loading';
      loadingMsg.innerHTML = `
        <div class="normal-message-avatar">E</div>
        <div class="normal-message-content">
          <div class="normal-message-bubble">
            <div class="normal-typing-indicator">
              <div class="normal-typing-dot"></div>
              <div class="normal-typing-dot"></div>
              <div class="normal-typing-dot"></div>
            </div>
          </div>
        </div>
      `;
      messagesContainer.appendChild(loadingMsg);
      chatArea.scrollTop = chatArea.scrollHeight;
      
      // Call AI API
      try {
        const response = await fetch('http://127.0.0.1:8001/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, history: normalChatMessages })
        });
        
        const data = await response.json();
        
        // Remove loading
        loadingMsg.remove();
        
        const responseTime = new Date().toLocaleTimeString();
        const aiResponse = data.response || 'Sorry, I encountered an error.';
        
        // Add AI response
        const aiMsg = document.createElement('div');
        aiMsg.className = 'normal-message assistant';
        aiMsg.innerHTML = `
          <div class="normal-message-avatar">E</div>
          <div class="normal-message-content">
            <div class="normal-message-bubble">
              <div class="normal-message-text">${aiResponse}</div>
            </div>
            <div class="normal-message-time">${responseTime}</div>
          </div>
        `;
        messagesContainer.appendChild(aiMsg);
        
        // Save AI response to history
        normalChatMessages.push({ role: 'assistant', content: aiResponse, time: responseTime });
        
        // Save chat and update UI
        saveCurrentChat();
        updateChatListUI();
        
        chatArea.scrollTop = chatArea.scrollHeight;
        
      } catch (error) {
        console.error('Error sending message:', error);
        loadingMsg.remove();
        
        const errorTime = new Date().toLocaleTimeString();
        const errorResponse = "Sorry, I'm unable to connect to the backend server. Please check if the server is running.";
        
        const errorMsg = document.createElement('div');
        errorMsg.className = 'normal-message assistant';
        errorMsg.innerHTML = `
          <div class="normal-message-avatar">E</div>
          <div class="normal-message-content">
            <div class="normal-message-bubble">
              <div class="normal-message-text">${errorResponse}</div>
            </div>
            <div class="normal-message-time">${errorTime}</div>
          </div>
        `;
        messagesContainer.appendChild(errorMsg);
        
        // Save error message to history
        normalChatMessages.push({ role: 'assistant', content: errorResponse, time: errorTime });
        saveCurrentChat();
        updateChatListUI();
        
        chatArea.scrollTop = chatArea.scrollHeight;
      }
    }
    
    // Send button click
    if (normalSendBtn) {
      normalSendBtn.addEventListener('click', sendNormalMessage);
    }
    
    // Enter key to send
    if (normalMainInput) {
      normalMainInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendNormalMessage();
        }
      });
    }
    
    // Voice button (placeholder)
    if (normalVoiceBtn) {
      normalVoiceBtn.addEventListener('click', () => {
        console.log('Voice input clicked (not implemented yet)');
        showAlertDialog(
          'Voice Input',
          'Voice input feature is coming soon! Stay tuned for updates.',
          { type: 'info', confirmText: 'Got it' }
        );
      });
    }
    
    // Feature buttons (Images, Videos, Projects)
    const featureButtons = document.querySelectorAll('.normal-sidebar-item');
    featureButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const feature = btn.textContent.trim();
        console.log(`${feature} feature clicked`);
        showAlertDialog(
          feature,
          `${feature} feature is coming soon! We're working hard to bring this to you.`,
          { type: 'info', confirmText: 'Okay' }
        );
      });
    });
    
    // Quick action cards
    const actionCards = document.querySelectorAll('.normal-action-card');
    actionCards.forEach(card => {
      card.addEventListener('click', () => {
        const title = card.querySelector('h4').textContent;
        console.log(`${title} clicked`);
        
        // Pre-fill input with relevant prompt
        if (normalMainInput) {
          if (title.includes('Image')) {
            normalMainInput.value = 'Generate an image of ';
          } else if (title.includes('Video')) {
            normalMainInput.value = 'Create a video about ';
          } else if (title.includes('Dev')) {
            normalMainInput.value = 'Help me code ';
          }
          normalMainInput.focus();
        }
      });
    });
    
    // Initialize chat list on startup
    updateChatListUI();
    
    // ============================================================
    // Custom Dialog System
    // ============================================================
    
    const dialogOverlay = document.getElementById('custom-dialog-overlay');
    const dialogTitle = document.getElementById('dialog-title');
    const dialogMessage = document.getElementById('dialog-message');
    const dialogIcon = document.getElementById('dialog-icon');
    const dialogConfirm = document.getElementById('dialog-confirm');
    const dialogCancel = document.getElementById('dialog-cancel');
    const dialogButtons = document.querySelector('.custom-dialog-buttons');
    
    let dialogResolve = null;
    
    // Show custom confirm dialog
    function showConfirmDialog(title, message, options = {}) {
      return new Promise((resolve) => {
        dialogResolve = resolve;
        
        // Set content
        dialogTitle.textContent = title;
        dialogMessage.textContent = message;
        
        // Set icon type
        dialogIcon.className = 'custom-dialog-icon';
        if (options.type === 'warning') {
          dialogIcon.classList.add('warning');
          dialogIcon.innerHTML = `
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          `;
        } else if (options.type === 'danger') {
          dialogIcon.classList.add('warning');
          dialogIcon.innerHTML = `
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              <line x1="10" y1="11" x2="10" y2="17"/>
              <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
          `;
        } else {
          dialogIcon.innerHTML = `
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y1="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          `;
        }
        
        // Set button text
        dialogConfirm.textContent = options.confirmText || 'Confirm';
        dialogCancel.textContent = options.cancelText || 'Cancel';
        
        // Set button style
        dialogConfirm.className = 'custom-dialog-btn custom-dialog-confirm';
        if (options.type === 'danger') {
          dialogConfirm.classList.add('danger');
        }
        
        // Show dialog
        dialogOverlay.classList.add('show');
      });
    }
    
    // Show custom alert dialog
    function showAlertDialog(title, message, options = {}) {
      return new Promise((resolve) => {
        dialogResolve = resolve;
        
        // Set content
        dialogTitle.textContent = title;
        dialogMessage.textContent = message;
        
        // Set icon
        dialogIcon.className = 'custom-dialog-icon';
        if (options.type === 'success') {
          dialogIcon.classList.add('success');
          dialogIcon.innerHTML = `
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          `;
        } else if (options.type === 'info') {
          dialogIcon.classList.add('info');
          dialogIcon.innerHTML = `
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
          `;
        }
        
        // Set button
        dialogConfirm.textContent = options.confirmText || 'OK';
        dialogConfirm.className = 'custom-dialog-btn custom-dialog-confirm';
        
        // Hide cancel button (single button mode)
        dialogButtons.classList.add('single');
        
        // Show dialog
        dialogOverlay.classList.add('show');
      });
    }
    
    // Close dialog
    function closeDialog(result) {
      dialogOverlay.classList.remove('show');
      dialogButtons.classList.remove('single');
      if (dialogResolve) {
        dialogResolve(result);
        dialogResolve = null;
      }
    }
    
    // Dialog button handlers
    if (dialogConfirm) {
      dialogConfirm.addEventListener('click', () => closeDialog(true));
    }
    
    if (dialogCancel) {
      dialogCancel.addEventListener('click', () => closeDialog(false));
    }
    
    // Close on overlay click
    if (dialogOverlay) {
      dialogOverlay.addEventListener('click', (e) => {
        if (e.target === dialogOverlay) {
          closeDialog(false);
        }
      });
    }
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dialogOverlay.classList.contains('show')) {
        closeDialog(false);
      }
    });

    // Auto-resize textarea
    if (aiInput) {
      aiInput.addEventListener('input', () => {
        aiInput.style.height = 'auto';
        aiInput.style.height = Math.min(aiInput.scrollHeight, 150) + 'px';
      });

      // Handle Ctrl+Enter to send
      aiInput.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
          e.preventDefault();
          sendAIMessage();
        }
      });
    }

    // Send message
    if (aiSendBtn) {
      aiSendBtn.addEventListener('click', () => {
        sendAIMessage();
      });
    }

    async function sendAIMessage() {
      if (!aiInput || !aiChatContainer) return;

      const message = aiInput.value.trim();
      if (!message) return;

      // Remove welcome message if exists
      const welcomeMsg = aiChatContainer.querySelector('.ai-welcome-message');
      if (welcomeMsg) {
        welcomeMsg.remove();
      }

      // Add user message
      addAIMessage('user', message);

      // Clear input
      aiInput.value = '';
      aiInput.style.height = 'auto';

      // Disable send button
      if (aiSendBtn) aiSendBtn.disabled = true;

      // Show loading indicator
      const loadingId = addAILoadingIndicator();

      try {
        // Send to backend
        const response = await fetch('http://127.0.0.1:8001/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: message,
            context: {
              currentFile: currentFile,
              workspaceFolder: currentWorkspaceFolder
            }
          })
        });

        if (!response.ok) {
          throw new Error('Failed to get AI response');
        }

        const data = await response.json();

        // Remove loading indicator
        removeAILoadingIndicator(loadingId);

        // Add AI response
        addAIMessage('assistant', data.response || 'I apologize, but I could not generate a response.');

      } catch (error) {
        console.error('AI error:', error);

        // Remove loading indicator
        removeAILoadingIndicator(loadingId);

        // Add error message
        addAIMessage('assistant', '⚠️ Sorry, I encountered an error. Please make sure the backend is running.');
      } finally {
        // Re-enable send button
        if (aiSendBtn) aiSendBtn.disabled = false;
      }
    }

    function addAIMessage(role, content) {
      if (!aiChatContainer) return;

      const messageDiv = document.createElement('div');
      messageDiv.className = `ai-message ${role}`;

      const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

      messageDiv.innerHTML = `
        <div class="ai-message-avatar">${role === 'user' ? 'U' : 'AI'}</div>
        <div class="ai-message-content">
          <div class="ai-message-bubble">${escapeHTML(content)}</div>
          <div class="ai-message-time">${time}</div>
        </div>
      `;

      aiChatContainer.appendChild(messageDiv);

      // Scroll to bottom
      aiChatContainer.scrollTop = aiChatContainer.scrollHeight;

      // Add to history
      aiChatHistory.push({ role, content, time });
    }

    function addAILoadingIndicator() {
      if (!aiChatContainer) return null;

      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'ai-message assistant';
      const loadingId = 'loading-' + Date.now();
      loadingDiv.id = loadingId;

      loadingDiv.innerHTML = `
        <div class="ai-message-avatar">AI</div>
        <div class="ai-message-content">
          <div class="ai-message-bubble">
            <div class="ai-loading">
              <div class="ai-loading-dot"></div>
              <div class="ai-loading-dot"></div>
              <div class="ai-loading-dot"></div>
            </div>
          </div>
        </div>
      `;

      aiChatContainer.appendChild(loadingDiv);
      aiChatContainer.scrollTop = aiChatContainer.scrollHeight;

      return loadingId;
    }

    function removeAILoadingIndicator(loadingId) {
      if (!loadingId) return;
      const loadingDiv = document.getElementById(loadingId);
      if (loadingDiv) {
        loadingDiv.remove();
      }
    }

    function escapeHTML(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML.replace(/\n/g, '<br>');
    }

    // ============================================================
    // Context Menu
    // ============================================================
    function showContextMenu(x, y, itemPath, isDirectory) {
      // Remove any existing context menu
      const existingMenu = document.querySelector('.context-menu');
      if (existingMenu) {
        existingMenu.remove();
      }
      
      // Create context menu
      const menu = document.createElement('div');
      menu.className = 'context-menu';
      menu.style.left = `${x}px`;
      menu.style.top = `${y}px`;
      
      // Menu items
      const menuItems = [];
      
      if (isDirectory) {
        menuItems.push(
          { icon: '📄', label: 'New File', action: () => createNewFile(itemPath) },
          { icon: '📁', label: 'New Folder', action: () => createNewFolder(itemPath) },
          { separator: true },
          { icon: '🗑️', label: 'Delete', action: () => deleteItem(itemPath, true), danger: true }
        );
      } else {
        menuItems.push(
          { icon: '🗑️', label: 'Delete', action: () => deleteItem(itemPath, false), danger: true }
        );
      }
      
      // Build menu HTML
      menuItems.forEach(item => {
        if (item.separator) {
          const separator = document.createElement('div');
          separator.className = 'context-menu-separator';
          menu.appendChild(separator);
        } else {
          const menuItem = document.createElement('div');
          menuItem.className = 'context-menu-item';
          if (item.danger) menuItem.classList.add('danger');
          menuItem.innerHTML = `<span class="context-menu-icon">${item.icon}</span><span>${item.label}</span>`;
          
          menuItem.addEventListener('click', (e) => {
            e.stopPropagation();
            item.action();
            menu.remove();
          });
          
          menu.appendChild(menuItem);
        }
      });
      
      document.body.appendChild(menu);
      
      // Adjust position if menu goes off screen
      const rect = menu.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        menu.style.left = `${x - rect.width}px`;
      }
      if (rect.bottom > window.innerHeight) {
        menu.style.top = `${y - rect.height}px`;
      }
      
      // Close menu when clicking outside
      const closeMenu = (e) => {
        if (!menu.contains(e.target)) {
          menu.remove();
          document.removeEventListener('click', closeMenu);
        }
      };
      
      setTimeout(() => {
        document.addEventListener('click', closeMenu);
      }, 10);
    }

  } // End of init function

})();
