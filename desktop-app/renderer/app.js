/* ============================================================
   NovaGen IDE - Main Application Logic
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
    console.log('NovaGen IDE Initialized');

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
    activityIcons.forEach(icon => {
      icon.addEventListener('click', () => {
        activityIcons.forEach(i => i.classList.remove('active'));
        icon.classList.add('active');

        const view = icon.dataset.view;
        console.log('Switched to view:', view);

        // Handle view switching logic here
        if (view === 'explorer') {
          // Show explorer
        } else if (view === 'search') {
          // Show search
        } else if (view === 'git') {
          // Show git
        }
      });
    });

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

    async function createNewFile() {
      if (!window.electronAPI) {
        appendTerminalLine('✗ Electron API not available');
        console.error('electronAPI not available');
        return;
      }

      try {
        const workspacePath = await window.electronAPI.getWorkspacePath();
        
        if (!workspacePath) {
          appendTerminalLine('⚠ Please open a folder first (Ctrl+K Ctrl+O)');
          return;
        }

        // Prompt for file name
        const fileName = prompt('Enter file name:', 'untitled.txt');
        if (!fileName) return;

        // Create the file
        const result = await window.electronAPI.createFile(fileName);
        
        if (result.success) {
          appendTerminalLine(`✓ Created new file: ${fileName}`);
          
          // Open the file in editor
          openFile(fileName, '');
          
          // Refresh file tree
          await refreshFileTree();
        }
      } catch (error) {
        console.error('Error creating file:', error);
        appendTerminalLine(`✗ Error creating file: ${error.message}`);
      }
    }

    async function createNewFolder() {
      if (!window.electronAPI) {
        appendTerminalLine('✗ Electron API not available');
        console.error('electronAPI not available');
        return;
      }

      try {
        const workspacePath = await window.electronAPI.getWorkspacePath();
        
        if (!workspacePath) {
          appendTerminalLine('⚠ Please open a folder first (Ctrl+K Ctrl+O)');
          return;
        }

        // Prompt for folder name
        const folderName = prompt('Enter folder name:', 'new-folder');
        if (!folderName) return;

        // Create the folder
        await window.electronAPI.createFolder(folderName);
        
        appendTerminalLine(`✓ Created new folder: ${folderName}`);
        
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
        const content = codeEditor ? codeEditor.value : '';
        
        // Save to file system
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
      } catch (error) {
        console.error('Error saving file:', error);
        appendTerminalLine(`✗ Error saving file: ${error.message}`);
      }
    }

    async function saveFileAs() {
      if (!currentFile) {
        appendTerminalLine('ℹ No file to save');
        return;
      }

      try {
        const workspacePath = await window.electronAPI.getWorkspacePath();
        
        if (!workspacePath) {
          appendTerminalLine('⚠ Please open a folder first');
          return;
        }

        const newFileName = prompt('Save as:', currentFile);
        if (!newFileName) return;

        const content = codeEditor ? codeEditor.value : '';
        
        // Create and save new file
        await window.electronAPI.createFile(newFileName);
        await window.electronAPI.writeFile(newFileName, content);
        
        appendTerminalLine(`✓ Saved as: ${newFileName}`);
        
        // Open the new file
        openFile(newFileName, content);
        
        // Refresh file tree
        await refreshFileTree();
      } catch (error) {
        console.error('Error saving file as:', error);
        appendTerminalLine(`✗ Error: ${error.message}`);
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
      const sidebar = document.getElementById('sidebar');
      if (!sidebar) return;
      
      if (sidebarVisible) {
        sidebar.style.display = 'none';
        sidebarVisible = false;
        appendTerminalLine('✓ Sidebar hidden');
      } else {
        sidebar.style.display = 'flex';
        sidebarVisible = true;
        appendTerminalLine('✓ Sidebar visible');
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
        return `// ${fileName}\nconsole.log('Hello from NovaGen IDE');\n\nfunction example() {\n  return 'Welcome to NovaGen';\n}\n`;
      } else if (ext === 'html') {
        return `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>Document</title>\n</head>\n<body>\n  <h1>Hello NovaGen</h1>\n</body>\n</html>`;
      } else if (ext === 'css') {
        return `/* ${fileName} */\nbody {\n  margin: 0;\n  padding: 0;\n  font-family: Arial, sans-serif;\n}\n`;
      } else {
        return `Welcome to NovaGen IDE\n\nThis is a sample file: ${fileName}`;
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
      // Keywords
      code = code.replace(/\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|new|class|extends|import|export|from|default|async|await|typeof|instanceof|void|delete|in|of)\b/g, '<span class="keyword">$1</span>');
      
      // Booleans and null
      code = code.replace(/\b(true|false|null|undefined|NaN|Infinity)\b/g, '<span class="boolean">$1</span>');
      
      // Numbers
      code = code.replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>');
      
      // Strings
      code = code.replace(/(["'`])(?:(?=(\\?))\2.)*?\1/g, '<span class="string">$&</span>');
      
      // Comments
      code = code.replace(/\/\/.*/g, '<span class="comment">$&</span>');
      code = code.replace(/\/\*[\s\S]*?\*\//g, '<span class="comment">$&</span>');
      
      // Functions
      code = code.replace(/\b([a-zA-Z_$][\w$]*)\s*\(/g, '<span class="function">$1</span>(');
      
      return code;
    }
    
    function highlightHTML(code) {
      // Tags
      code = code.replace(/&lt;\/?([\w-]+)/g, '&lt;<span class="tag">$1</span>');
      
      // Attributes
      code = code.replace(/\s+([\w-]+)=/g, ' <span class="attribute">$1</span>=');
      
      // Strings
      code = code.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '<span class="string">$&</span>');
      
      // Comments
      code = code.replace(/&lt;!--[\s\S]*?--&gt;/g, '<span class="comment">$&</span>');
      
      return code;
    }
    
    function highlightCSS(code) {
      // Properties
      code = code.replace(/\b([\w-]+):/g, '<span class="property">$1</span>:');
      
      // Selectors
      code = code.replace(/([.#]?[\w-]+)\s*\{/g, '<span class="tag">$1</span> {');
      
      // Strings
      code = code.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '<span class="string">$&</span>');
      
      // Comments
      code = code.replace(/\/\*[\s\S]*?\*\//g, '<span class="comment">$&</span>');
      
      // Numbers and units
      code = code.replace(/\b(\d+\.?\d*)(px|em|rem|%|vh|vw)?\b/g, '<span class="number">$1$2</span>');
      
      return code;
    }
    
    function highlightJSON(code) {
      // Keys
      code = code.replace(/(["'])([^"']+)\1\s*:/g, '<span class="property">$1$2$1</span>:');
      
      // Strings
      code = code.replace(/:\s*(["'])(?:(?=(\\?))\2.)*?\1/g, ': <span class="string">$1</span>');
      
      // Numbers
      code = code.replace(/:\s*(\d+\.?\d*)/g, ': <span class="number">$1</span>');
      
      // Booleans and null
      code = code.replace(/:\s*(true|false|null)/g, ': <span class="boolean">$1</span>');
      
      return code;
    }
    
    function highlightPython(code) {
      // Keywords
      code = code.replace(/\b(def|class|import|from|return|if|elif|else|for|while|try|except|finally|with|as|pass|break|continue|lambda|yield|async|await|None|True|False)\b/g, '<span class="keyword">$1</span>');
      
      // Strings
      code = code.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '<span class="string">$&</span>');
      
      // Comments
      code = code.replace(/#.*/g, '<span class="comment">$&</span>');
      
      // Numbers
      code = code.replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>');
      
      // Functions
      code = code.replace(/\bdef\s+([a-zA-Z_]\w*)/g, 'def <span class="function">$1</span>');
      
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
        output = 'NovaGen IDE v1.0.0';
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

  } // End of init function

})();
