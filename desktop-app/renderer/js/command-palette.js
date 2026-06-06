/* ─── Command Palette ─────────────────────────────────────────────────────── */

const CommandPalette = (() => {
  const palette   = document.getElementById('command-palette');
  const input     = document.getElementById('command-palette-input');
  const results   = document.getElementById('command-palette-results');

  let focusedIdx = -1;
  let mode = 'commands'; // 'commands' | 'files' | 'language'
  let allItems = [];

  const commands = [
    { label: 'New File',                  key: 'Ctrl+N',       action: () => EditorManager.newFile(),            icon: 'file' },
    { label: 'Open File...',              key: 'Ctrl+O',       action: openFile,                                 icon: 'file' },
    { label: 'Open Folder...',            key: 'Ctrl+Shift+O', action: openFolder,                               icon: 'folder' },
    { label: 'Save',                      key: 'Ctrl+S',       action: () => EditorManager.saveCurrentFile(),    icon: 'save' },
    { label: 'Save As...',                key: 'Ctrl+Shift+S', action: () => EditorManager.saveAs(),             icon: 'save' },
    { label: 'Toggle Sidebar',            key: 'Ctrl+B',       action: () => App.toggleSidebar(),                icon: 'layout' },
    { label: 'Toggle Terminal',           key: 'Ctrl+`',       action: () => Terminal.toggle(),                  icon: 'terminal' },
    { label: 'Find in File',              key: 'Ctrl+F',       action: () => EditorManager.openFind(),           icon: 'search' },
    { label: 'Replace in File',           key: 'Ctrl+H',       action: () => EditorManager.openReplace(),        icon: 'replace' },
    { label: 'Close Tab',                 key: 'Ctrl+W',       action: () => { const t = TabManager.getActive(); if (t) TabManager.closeTab(t.id); }, icon: 'x' },
    { label: 'Theme: Nova Dark',          action: () => App.applyTheme('nova-dark'),   icon: 'theme' },
    { label: 'Theme: Nova Light',         action: () => App.applyTheme('nova-light'),  icon: 'theme' },
    { label: 'Theme: Nova Midnight',      action: () => App.applyTheme('nova-midnight'), icon: 'theme' },
    { label: 'Go to Line...',             key: 'Ctrl+G',       action: goToLine,                                 icon: 'goto' },
    { label: 'Zoom In',                   action: () => document.body.style.zoom = (parseFloat(document.body.style.zoom || 1) + 0.1).toString(), icon: 'zoom' },
    { label: 'Zoom Out',                  action: () => document.body.style.zoom = Math.max(0.5, parseFloat(document.body.style.zoom || 1) - 0.1).toString(), icon: 'zoom' },
    { label: 'Reset Zoom',                action: () => document.body.style.zoom = '1', icon: 'zoom' },
    { label: 'Show Welcome',              action: () => EditorManager.showWelcome(),   icon: 'home' },
  ];

  // ─── API ──────────────────────────────────────────────────────────────────

  function show(forceMode) {
    mode = forceMode || 'commands';
    palette.classList.remove('hidden');
    input.value = mode === 'files' ? '' : (mode === 'language' ? '' : '>');
    input.focus();
    input.select();
    render(commands);
    focusedIdx = 0;
    updateFocus();
  }

  function hide() {
    palette.classList.add('hidden');
    focusedIdx = -1;
  }

  function isVisible() { return !palette.classList.contains('hidden'); }

  // ─── Rendering ────────────────────────────────────────────────────────────

  function render(items) {
    allItems = items;
    results.innerHTML = '';
    if (!items.length) {
      results.innerHTML = '<div style="padding:12px 16px;color:var(--text-muted);font-size:12px">No results</div>';
      return;
    }
    items.forEach((item, idx) => {
      const el = document.createElement('div');
      el.className = 'palette-item';
      el.dataset.idx = idx;
      el.innerHTML = `
        <span class="palette-item-icon">${getPaletteIcon(item.icon)}</span>
        <span>${Utils.escapeHtml(item.label)}</span>
        ${item.key ? `<span class="palette-item-key">${Utils.escapeHtml(item.key)}</span>` : ''}
      `;
      el.addEventListener('mouseenter', () => { focusedIdx = idx; updateFocus(); });
      el.addEventListener('click', () => { hide(); item.action && item.action(); });
      results.appendChild(el);
    });
    updateFocus();
  }

  function updateFocus() {
    results.querySelectorAll('.palette-item').forEach((el, idx) => {
      el.classList.toggle('focused', idx === focusedIdx);
    });
    const focused = results.querySelector('.palette-item.focused');
    if (focused) focused.scrollIntoView({ block: 'nearest' });
  }

  // ─── Search logic ─────────────────────────────────────────────────────────

  input.addEventListener('input', () => {
    const q = input.value;

    if (q.startsWith('>')) {
      // Command mode
      const query = q.slice(1).toLowerCase().trim();
      const filtered = query ? commands.filter(c => c.label.toLowerCase().includes(query)) : commands;
      render(filtered);
    } else {
      // File search mode
      const query = q.toLowerCase().trim();
      searchFiles(query);
    }
    focusedIdx = 0;
    updateFocus();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { hide(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusedIdx = Math.min(focusedIdx + 1, allItems.length - 1);
      updateFocus();
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusedIdx = Math.max(focusedIdx - 1, 0);
      updateFocus();
    }
    if (e.key === 'Enter') {
      const item = allItems[focusedIdx];
      if (item) { hide(); item.action && item.action(); }
    }
  });

  // Close on outside click
  document.addEventListener('mousedown', (e) => {
    if (isVisible() && !palette.contains(e.target)) hide();
  });

  // ─── File search ──────────────────────────────────────────────────────────

  async function searchFiles(query) {
    const rootPath = FileTree.getRootPath();
    if (!rootPath) { render([]); return; }

    // Get all files recursively (limited)
    const files = await collectFiles(rootPath, 3);
    const filtered = query
      ? files.filter(f => f.name.toLowerCase().includes(query) || f.path.toLowerCase().includes(query))
      : files.slice(0, 50);

    render(filtered.slice(0, 50).map(f => ({
      label: f.name,
      key: f.path.replace(rootPath, '').slice(1),
      icon: 'file',
      action: () => EditorManager.openFile(f.path),
    })));
  }

  async function collectFiles(dir, maxDepth, depth = 0) {
    if (depth > maxDepth) return [];
    const result = await window.novagen.fs.readDirectory(dir);
    if (!result.success) return [];
    const files = [];
    for (const entry of result.entries) {
      if (entry.isDirectory) {
        if (['node_modules', '.git', 'dist', 'build'].includes(entry.name)) continue;
        const sub = await collectFiles(entry.path, maxDepth, depth + 1);
        files.push(...sub);
      } else {
        files.push({ name: entry.name, path: entry.path });
      }
      if (files.length > 500) break;
    }
    return files;
  }

  // ─── Built-in actions ─────────────────────────────────────────────────────

  async function openFile() {
    const paths = await window.novagen.fs.openFileDialog();
    if (paths && paths.length) {
      for (const p of paths) await EditorManager.openFile(p);
    }
  }

  async function openFolder() {
    const path = await window.novagen.fs.openFolderDialog();
    if (path) FileTree.openFolder(path);
  }

  async function goToLine() {
    const val = await Modal.prompt('Go to Line', 'Enter line number');
    const n = parseInt(val);
    if (!isNaN(n)) {
      // Will be handled by Monaco
      const evt = new CustomEvent('goto-line', { detail: n });
      document.dispatchEvent(evt);
    }
  }

  // ─── Icons ────────────────────────────────────────────────────────────────

  function getPaletteIcon(type) {
    const icons = {
      file:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
      folder:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 2h9a2 2 0 012 2z"/></svg>`,
      save:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
      search:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/></svg>`,
      terminal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
      layout:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></svg>`,
      theme:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`,
      goto:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
      zoom:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>`,
      replace:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/></svg>`,
      home:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>`,
      x:        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    };
    return icons[type] || icons.file;
  }

  return { show, hide, isVisible };
})();

// Expose to window for other modules
window.CommandPalette = CommandPalette;
