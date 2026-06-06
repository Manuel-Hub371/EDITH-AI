/* ─── File Tree / Explorer ────────────────────────────────────────────────── */

const FileTree = (() => {
  const treeContainer = document.getElementById('file-tree');
  const noFolderEl    = document.getElementById('no-folder-open');
  const explorerEl    = document.getElementById('explorer-tree');

  let rootPath = null;
  let expanded = new Set();    // Set of expanded directory paths
  let selected  = null;        // Currently selected path

  // ─── Public API ──────────────────────────────────────────────────────────

  async function openFolder(folderPath) {
    rootPath = folderPath;
    expanded.clear();
    expanded.add(folderPath);
    noFolderEl.style.display = 'none';
    treeContainer.style.display = 'block';
    await refresh();
    document.title = `${folderPath.split(/[/\\]/).pop()} — EDITH`;
  }

  async function refresh() {
    if (!rootPath) return;
    treeContainer.innerHTML = '';
    await renderDirectory(rootPath, treeContainer, 0);
  }

  function getRootPath() { return rootPath; }
  function getSelected() { return selected; }

  function closeFolder() {
    rootPath = null;
    expanded.clear();
    selected = null;
    treeContainer.innerHTML = '';
    treeContainer.style.display = 'none';
    noFolderEl.style.display = 'flex';
    document.title = 'EDITH — Next-Generation AI Engineering';
    console.log('[FileTree] Folder closed');
  }

  // ─── Rendering ───────────────────────────────────────────────────────────

  async function renderDirectory(dirPath, parentEl, depth) {
    const result = await window.novagen.fs.readDirectory(dirPath);
    if (!result.success) return;

    for (const entry of result.entries) {
      // Skip hidden files at root (optional: could be a setting)
      if (depth === 0 && entry.name.startsWith('.') && entry.name !== '.gitignore' && entry.name !== '.env') {
        // still show, just don't skip
      }
      const itemEl = createTreeItem(entry, depth);
      parentEl.appendChild(itemEl);

      if (entry.isDirectory) {
        const childrenEl = document.createElement('div');
        childrenEl.className = 'tree-children';
        parentEl.appendChild(childrenEl);

        if (expanded.has(entry.path)) {
          childrenEl.classList.remove('collapsed');
          await renderDirectory(entry.path, childrenEl, depth + 1);
        } else {
          childrenEl.classList.add('collapsed');
        }

        // Store reference
        itemEl.dataset.childrenId = childrenEl.dataset.path = entry.path;
      }
    }
  }

  function createTreeItem(entry, depth) {
    const item = document.createElement('div');
    item.className = 'tree-item';
    item.dataset.path = entry.path;
    item.dataset.isDir = entry.isDirectory;

    if (selected === entry.path) item.classList.add('active');

    const indent = depth * 12 + 4;

    // Arrow
    const arrow = document.createElement('span');
    arrow.className = 'tree-item-arrow';
    if (entry.isDirectory) {
      arrow.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>`;
      if (expanded.has(entry.path)) arrow.classList.add('open');
    } else {
      arrow.classList.add('empty');
      arrow.innerHTML = `<svg viewBox="0 0 24 24"></svg>`;
    }

    // Icon
    const icon = document.createElement('span');
    icon.className = 'tree-item-icon';
    icon.innerHTML = Utils.getFileIcon(entry.name, entry.isDirectory, expanded.has(entry.path));

    // Name
    const name = document.createElement('span');
    name.className = 'tree-item-name';
    name.textContent = entry.name;

    item.style.paddingLeft = `${indent}px`;
    item.appendChild(arrow);
    item.appendChild(icon);
    item.appendChild(name);

    // Click handler
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      handleItemClick(entry, item, arrow, icon);
    });

    // Double-click to open file
    item.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      if (!entry.isDirectory) {
        EditorManager.openFile(entry.path);
      }
    });

    // Context menu
    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      selected = entry.path;
      updateSelection();
      showContextMenu(e.clientX, e.clientY, entry);
    });

    return item;
  }

  async function handleItemClick(entry, item, arrow, icon) {
    selected = entry.path;
    updateSelection();

    if (entry.isDirectory) {
      const isExpanded = expanded.has(entry.path);

      // Find children container
      const childrenEl = item.nextElementSibling;
      if (!childrenEl || !childrenEl.classList.contains('tree-children')) return;

      if (isExpanded) {
        expanded.delete(entry.path);
        arrow.classList.remove('open');
        icon.innerHTML = Utils.getFileIcon(entry.name, true, false);
        childrenEl.classList.add('collapsed');
        childrenEl.innerHTML = '';
      } else {
        expanded.add(entry.path);
        arrow.classList.add('open');
        icon.innerHTML = Utils.getFileIcon(entry.name, true, true);
        childrenEl.classList.remove('collapsed');
        if (childrenEl.children.length === 0) {
          const depth = parseInt(item.style.paddingLeft) / 12;
          await renderDirectory(entry.path, childrenEl, depth + 1);
        }
      }
    } else {
      EditorManager.openFile(entry.path);
    }
  }

  function updateSelection() {
    document.querySelectorAll('.tree-item.active').forEach(el => el.classList.remove('active'));
    const active = treeContainer.querySelector(`[data-path="${CSS.escape(selected)}"]`);
    if (active) active.classList.add('active');
  }

  // ─── Context Menu ─────────────────────────────────────────────────────────

  function showContextMenu(x, y, entry) {
    const isDir = entry.isDirectory;
    const items = [];

    if (isDir) {
      items.push({ label: 'New File', icon: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>', action: () => newFileInDir(entry.path) });
      items.push({ label: 'New Folder', icon: '<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 2h9a2 2 0 012 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>', action: () => newFolderInDir(entry.path) });
      items.push({ separator: true });
    }

    items.push({ label: 'Rename', icon: '<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>', action: () => renameItem(entry) });
    items.push({ label: 'Delete', danger: true, icon: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>', action: () => deleteItem(entry) });
    items.push({ separator: true });
    items.push({ label: 'Copy Path', icon: '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>', action: () => { navigator.clipboard.writeText(entry.path); Notifications.info('Copied', 'Path copied to clipboard'); } });

    ContextMenu.show(x, y, items);
  }

  // Context menu on empty space in tree
  treeContainer.addEventListener('contextmenu', (e) => {
    // Only if clicking on the container itself, not on a tree item
    if (e.target === treeContainer && rootPath) {
      e.preventDefault();
      e.stopPropagation();
      const items = [
        { label: 'New File', icon: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>', action: () => newFileInDir(rootPath) },
        { label: 'New Folder', icon: '<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 2h9a2 2 0 012 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>', action: () => newFolderInDir(rootPath) },
        { separator: true },
        { label: 'Refresh', icon: '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>', action: () => refresh() },
      ];
      ContextMenu.show(e.clientX, e.clientY, items);
    }
  });

  // ─── File Operations ──────────────────────────────────────────────────────

  async function newFileInDir(dirPath) {
    const name = await Modal.prompt('New File', 'filename.txt');
    if (!name) return;
    const fullPath = dirPath + '\\' + name;
    const result = await window.novagen.fs.createFile(fullPath);
    if (result.success) {
      await refresh();
      EditorManager.openFile(fullPath);
      Notifications.success('File Created', name);
    } else {
      Notifications.error('Error', result.error);
    }
  }

  async function newFolderInDir(dirPath) {
    const name = await Modal.prompt('New Folder', 'folder-name');
    if (!name) return;
    const fullPath = dirPath + '\\' + name;
    const result = await window.novagen.fs.createDirectory(fullPath);
    if (result.success) {
      await refresh();
      Notifications.success('Folder Created', name);
    } else {
      Notifications.error('Error', result.error);
    }
  }

  async function renameItem(entry) {
    const name = await Modal.prompt('Rename', entry.name, entry.name);
    if (!name || name === entry.name) return;
    const dir = entry.path.split(/[/\\]/).slice(0, -1).join('\\') || entry.path;
    const newPath = dir + '\\' + name;
    const result = await window.novagen.fs.renamePath(entry.path, newPath);
    if (result.success) {
      // Update open tabs if renamed file was open
      TabManager.onPathRenamed(entry.path, newPath);
      await refresh();
      Notifications.success('Renamed', `${entry.name} → ${name}`);
    } else {
      Notifications.error('Error', result.error);
    }
  }

  async function deleteItem(entry) {
    const confirmed = await Modal.confirm('Delete', `Are you sure you want to delete "${entry.name}"? This cannot be undone.`, 'Delete');
    if (!confirmed) return;
    const result = await window.novagen.fs.deletePath(entry.path);
    if (result.success) {
      TabManager.onPathDeleted(entry.path);
      await refresh();
      Notifications.success('Deleted', entry.name);
    } else {
      Notifications.error('Error', result.error);
    }
  }

  // ─── Toolbar buttons ──────────────────────────────────────────────────────

  document.getElementById('btn-new-file').addEventListener('click', async () => {
    // If workspace is open
    if (rootPath) {
      if (selected && document.querySelector(`[data-path="${CSS.escape(selected)}"][data-is-dir="true"]`)) {
        newFileInDir(selected);
      } else {
        newFileInDir(rootPath);
      }
    } else {
      // No workspace open - create untitled file in editor
      if (window.EditorManager) {
        EditorManager.newFile();
        Notifications.info('New File', 'Use Save As (Ctrl+Shift+S) to save this file anywhere');
      }
    }
  });

  document.getElementById('btn-new-folder').addEventListener('click', async () => {
    // If workspace is open
    if (rootPath) {
      if (selected && document.querySelector(`[data-path="${CSS.escape(selected)}"][data-is-dir="true"]`)) {
        newFolderInDir(selected);
      } else {
        newFolderInDir(rootPath);
      }
    } else {
      // No workspace open - show dialog to create folder anywhere
      const name = await Modal.prompt('New Folder', 'Enter folder name', 'new-folder');
      if (!name) return;
      
      const parentPath = await window.novagen.fs.openFolderDialog();
      if (!parentPath) return;
      
      const fullPath = parentPath + '\\' + name;
      const result = await window.novagen.fs.createDirectory(fullPath);
      
      if (result.success) {
        Notifications.success('Folder Created', `${name} created at ${parentPath}`);
        
        // Ask if they want to open this folder as workspace
        const openIt = await Modal.confirm('Open Folder?', `Would you like to open "${name}" as your workspace?`, 'Open Folder');
        if (openIt) {
          openFolder(fullPath);
        }
      } else {
        Notifications.error('Error', result.error);
      }
    }
  });

  document.getElementById('btn-refresh-explorer').addEventListener('click', refresh);

  document.getElementById('btn-open-folder').addEventListener('click', async () => {
    const path = await window.novagen.fs.openFolderDialog();
    if (path) openFolder(path);
  });

  document.getElementById('btn-open-folder-empty').addEventListener('click', async () => {
    const path = await window.novagen.fs.openFolderDialog();
    if (path) openFolder(path);
  });

  return { openFolder, closeFolder, refresh, getRootPath, getSelected };
})();

// Expose to window for other modules
window.FileTree = FileTree;
