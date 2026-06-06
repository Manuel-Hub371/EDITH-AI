/**
 * titlebar.js
 * Owns: window controls, navbar search bar, navbar dropdown menus,
 *       Run / Terminal / Split action buttons.
 *
 * Runs independently of Monaco / App init — no async dependencies.
 */
(function () {

  // ─── Wait for module helper ────────────────────────────────────────────────
  function waitForModule(moduleName, callback, maxRetries = 50, delay = 100) {
    let retries = 0;
    function check() {
      if (window[moduleName]) {
        callback();
      } else if (retries < maxRetries) {
        retries++;
        setTimeout(check, delay);
      } else {
        console.error(`[titlebar] ${moduleName} not available after ${maxRetries * delay}ms`);
      }
    }
    check();
  }

  // ─── Action handler ────────────────────────────────────────────────────────
  function handleAction(action) {
    
    switch (action) {
      case 'toggle-terminal':
        waitForModule('Terminal', () => Terminal.toggle());
        break;
      case 'terminal-new':
        waitForModule('Terminal', () => Terminal.show());
        break;
      case 'terminal-clear':
        waitForModule('Terminal', () => Terminal.clear());
        break;
      case 'toggle-sidebar':
        waitForModule('App', () => App.toggleSidebar());
        break;
      case 'theme-nova-dark':
        waitForModule('App', () => App.applyTheme('nova-dark'));
        break;
      case 'theme-nova-light':
        waitForModule('App', () => App.applyTheme('nova-light'));
        break;
      case 'theme-nova-midnight':
        waitForModule('App', () => App.applyTheme('nova-midnight'));
        break;
      case 'zoom-in':
        (async () => {
          if (window.edith && window.edith.zoom) {
            const current = await window.edith.zoom.get();
            await window.edith.zoom.set(Math.min(2.0, current + 0.1));
          }
        })();
        break;
      case 'zoom-out':
        (async () => {
          if (window.edith && window.edith.zoom) {
            const current = await window.edith.zoom.get();
            await window.edith.zoom.set(Math.max(0.5, current - 0.1));
          }
        })();
        break;
      case 'zoom-reset':
        if (window.edith && window.edith.zoom) {
          window.edith.zoom.set(1.0);
        }
        break;
      case 'run-file':
        waitForModule('Notifications', () => Notifications.info('Run', 'Run configuration coming soon.'));
        break;
      case 'split-editor':
        waitForModule('Notifications', () => Notifications.info('Split Editor', 'Split editor view coming soon.'));
        break;
      case 'show-welcome':
        waitForModule('EditorManager', () => EditorManager.showWelcome());
        break;
      case 'about':
        waitForModule('Modal', () => Modal.alert('About EDITH', 'EDITH — Next-Generation AI Engineering\nVersion 1.0.0\n\nBuilt with Electron + Monaco Editor'));
        break;
      case 'new-file':
        waitForModule('EditorManager', () => {
          EditorManager.newFile();
          if (window.Notifications && !window.FileTree?.getRootPath?.()) {
            Notifications.info('New File', 'Use Save As (Ctrl+Shift+S) to save anywhere');
          }
        });
        break;
      case 'new-folder': {
        const btn = document.getElementById('btn-new-folder');
        if (btn) btn.click();
        break;
      }
      case 'save':
        waitForModule('EditorManager', () => EditorManager.saveCurrentFile());
        break;
      case 'save-as':
        waitForModule('EditorManager', () => EditorManager.saveAs());
        break;
      case 'find':
        waitForModule('EditorManager', () => EditorManager.openFind());
        break;
      case 'replace':
        waitForModule('EditorManager', () => EditorManager.openReplace());
        break;
      case 'close-tab':
        waitForModule('TabManager', () => {
          waitForModule('EditorManager', () => {
            const tab = TabManager.getActive();
            if (tab) {
              TabManager.closeTab(tab.id);
              EditorManager.destroyTab(tab.id);
            }
          });
        });
        break;
      case 'open-file':
        if (window.novagen) {
          window.novagen.fs.openFileDialog().then(paths => {
            if (paths && paths.length) {
              waitForModule('EditorManager', () => {
                paths.forEach(p => EditorManager.openFile(p));
              });
            }
          });
        }
        break;
      case 'open-folder':
        if (window.novagen) {
          window.novagen.fs.openFolderDialog().then(p => {
            if (p) {
              waitForModule('FileTree', () => FileTree.openFolder(p));
            }
          });
        }
        break;
      case 'close-folder':
        waitForModule('FileTree', () => {
          waitForModule('Modal', () => {
            Modal.confirm('Close Folder', 'Close the current folder and all open files?', 'Close Folder').then(confirmed => {
              if (confirmed) {
                if (window.TabManager && window.EditorManager) {
                  const tabs = TabManager.getTabs();
                  tabs.forEach(t => {
                    TabManager.closeTab(t.id);
                    EditorManager.destroyTab(t.id);
                  });
                }
                FileTree.closeFolder();
                if (window.EditorManager) EditorManager.showWelcome();
              }
            });
          });
        });
        break;
      case 'save-all':
        waitForModule('TabManager', () => {
          waitForModule('EditorManager', () => {
            const tabs = TabManager.getTabs();
            tabs.forEach(async (t) => {
              if (t.dirty) await EditorManager.saveFile(t.id);
            });
            if (window.Notifications) Notifications.success('Saved', 'All files saved');
          });
        });
        break;
      case 'close-all-tabs':
        waitForModule('Modal', () => {
          const dirtyCount = window.TabManager ? TabManager.getTabs().filter(t => t.dirty).length : 0;
          const msg = dirtyCount > 0 
            ? `You have ${dirtyCount} unsaved file${dirtyCount > 1 ? 's' : ''}. Close all tabs anyway?`
            : 'Close all open tabs?';
          Modal.confirm('Close All Tabs', msg, 'Close All').then(confirmed => {
            if (confirmed && window.TabManager && window.EditorManager) {
              const tabs = TabManager.getTabs();
              tabs.forEach(t => {
                TabManager.closeTab(t.id);
                EditorManager.destroyTab(t.id);
              });
              EditorManager.showWelcome();
            }
          });
        });
        break;
      case 'quit':
        if (window.novagen) window.novagen.window.close();
        break;
      case 'select-line':
        if (window.__monacoEditor) {
          const editor = window.__monacoEditor;
          const pos = editor.getPosition();
          editor.setSelection({
            startLineNumber: pos.lineNumber,
            startColumn: 1,
            endLineNumber: pos.lineNumber + 1,
            endColumn: 1
          });
        }
        break;
      default:
        console.warn('[titlebar] Unknown action:', action);
    }
  }

  // ─── Menu definitions ──────────────────────────────────────────────────────
  const MENUS = {
    file: [
      { label: 'New File',       key: 'Ctrl+N',       action: () => handleAction('new-file') },
      { label: 'New Folder',     key: 'Ctrl+Shift+N', action: () => handleAction('new-folder') },
      { sep: true },
      { label: 'Open File…',     key: 'Ctrl+O',       action: () => handleAction('open-file') },
      { label: 'Open Folder…',   key: 'Ctrl+Shift+O', action: () => handleAction('open-folder') },
      { label: 'Close Folder',   key: 'Ctrl+K F',     action: () => handleAction('close-folder') },
      { sep: true },
      { label: 'Save',           key: 'Ctrl+S',       action: () => handleAction('save') },
      { label: 'Save As…',       key: 'Ctrl+Shift+S', action: () => handleAction('save-as') },
      { label: 'Save All',       key: 'Ctrl+K S',     action: () => handleAction('save-all') },
      { sep: true },
      { label: 'Close Tab',      key: 'Ctrl+W',       action: () => handleAction('close-tab') },
      { label: 'Close All Tabs', key: 'Ctrl+K W',     action: () => handleAction('close-all-tabs') },
      { sep: true },
      { label: 'Quit',           key: 'Ctrl+Q',       action: () => handleAction('quit') },
    ],
    edit: [
      { label: 'Undo',           key: 'Ctrl+Z',       action: () => { if (window.__monacoEditor) window.__monacoEditor.trigger('keyboard', 'undo'); } },
      { label: 'Redo',           key: 'Ctrl+Y',       action: () => { if (window.__monacoEditor) window.__monacoEditor.trigger('keyboard', 'redo'); } },
      { sep: true },
      { label: 'Cut',            key: 'Ctrl+X',       action: () => { if (window.__monacoEditor) window.__monacoEditor.trigger('keyboard', 'editor.action.clipboardCutAction'); } },
      { label: 'Copy',           key: 'Ctrl+C',       action: () => { if (window.__monacoEditor) window.__monacoEditor.trigger('keyboard', 'editor.action.clipboardCopyAction'); } },
      { label: 'Paste',          key: 'Ctrl+V',       action: () => { if (window.__monacoEditor) window.__monacoEditor.trigger('keyboard', 'editor.action.clipboardPasteAction'); } },
      { sep: true },
      { label: 'Find',           key: 'Ctrl+F',       action: () => handleAction('find') },
      { label: 'Replace',        key: 'Ctrl+H',       action: () => handleAction('replace') },
    ],
    selection: [
      { label: 'Select All',     key: 'Ctrl+A',       action: () => { if (window.__monacoEditor) window.__monacoEditor.trigger('keyboard', 'editor.action.selectAll'); } },
      { label: 'Select Line',    key: 'Ctrl+L',       action: () => handleAction('select-line') },
      { sep: true },
      { label: 'Add Cursor Above', key: 'Ctrl+Alt+↑', action: () => { if (window.__monacoEditor) window.__monacoEditor.trigger('keyboard', 'editor.action.insertCursorAbove'); } },
      { label: 'Add Cursor Below', key: 'Ctrl+Alt+↓', action: () => { if (window.__monacoEditor) window.__monacoEditor.trigger('keyboard', 'editor.action.insertCursorBelow'); } },
    ],
    view: [
      { label: 'Toggle Sidebar', key: 'Ctrl+B',       action: () => handleAction('toggle-sidebar') },
      { label: 'Toggle Terminal',key: 'Ctrl+`',       action: () => handleAction('toggle-terminal') },
      { sep: true },
      { group: 'Appearance' },
      { label: 'Theme: Nova Dark',    action: () => handleAction('theme-nova-dark') },
      { label: 'Theme: Nova Light',   action: () => handleAction('theme-nova-light') },
      { label: 'Theme: Nova Midnight',action: () => handleAction('theme-nova-midnight') },
      { sep: true },
      { label: 'Zoom In',        key: 'Ctrl+=',       action: () => handleAction('zoom-in') },
      { label: 'Zoom Out',       key: 'Ctrl+-',       action: () => handleAction('zoom-out') },
      { label: 'Reset Zoom',     key: 'Ctrl+0',       action: () => handleAction('zoom-reset') },
    ],
    run: [
      { label: 'Run File',          key: 'F5',          action: () => handleAction('run-file') },
      { label: 'Run Without Debug', key: 'Ctrl+F5',     action: () => handleAction('run-file') },
      { sep: true },
      { label: 'Stop',              key: 'Shift+F5',    action: () => {}, disabled: true },
      { sep: true },
      { label: 'Add Configuration…',action: () => handleAction('run-file') },
    ],
    terminal: [
      { label: 'New Terminal',      key: 'Ctrl+Shift+`', action: () => handleAction('terminal-new') },
      { label: 'Split Terminal',                          action: () => handleAction('terminal-new') },
      { sep: true },
      { label: 'Clear Terminal',                          action: () => handleAction('terminal-clear') },
      { label: 'Kill Terminal',                           action: () => handleAction('terminal-clear') },
      { sep: true },
      { label: 'Toggle Terminal',   key: 'Ctrl+`',       action: () => handleAction('toggle-terminal') },
    ],
    help: [
      { label: 'Welcome',           action: () => handleAction('show-welcome') },
      { label: 'Keyboard Shortcuts',key: 'Ctrl+K Ctrl+S', action: () => handleAction('show-welcome') },
      { sep: true },
      { label: 'About EDITH',       action: () => handleAction('about') },
    ]
  };

  // ─── Dropdown ──────────────────────────────────────────────────────────────
  const dropdown     = document.getElementById('navbar-dropdown');
  const dropdownList = document.getElementById('navbar-dropdown-list');
  let activeMenuItem = null;

  function openMenu(menuKey, anchorEl) {
    const items = MENUS[menuKey];
    if (!items) return;

    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
    anchorEl.classList.add('active');
    activeMenuItem = anchorEl;

    dropdownList.innerHTML = '';
    items.forEach(item => {
      if (item.sep) {
        const li = document.createElement('li');
        li.className = 'dd-separator';
        dropdownList.appendChild(li);
        return;
      }
      if (item.group) {
        const li = document.createElement('li');
        li.className = 'dd-group-label';
        li.textContent = item.group;
        dropdownList.appendChild(li);
        return;
      }
      const li = document.createElement('li');
      li.className = 'dd-item' + (item.disabled ? ' disabled' : '');
      li.innerHTML = `
        <span class="dd-item-label">${item.label}</span>
        ${item.key ? `<span class="dd-item-key">${item.key}</span>` : ''}
      `;
      if (!item.disabled && item.action) {
        li.onclick = () => {
          closeMenu();
          // Execute action immediately
          try {
            item.action();
          } catch (err) {
            console.error('[titlebar] Action error:', err);
          }
        };
      }
      dropdownList.appendChild(li);
    });

    dropdown.classList.remove('hidden');
    const rect = anchorEl.getBoundingClientRect();
    let left = rect.left;
    const ddWidth = 210;
    if (left + ddWidth > window.innerWidth) left = window.innerWidth - ddWidth - 8;
    dropdown.style.left = `${left}px`;
    dropdown.style.top  = `${rect.bottom + 2}px`;
  }

  function closeMenu() {
    dropdown.classList.add('hidden');
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
    activeMenuItem = null;
  }

  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && !e.target.closest('.menu-item')) {
      closeMenu();
    }
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });

  document.querySelectorAll('.menu-item').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = el.dataset.menu;
      if (activeMenuItem === el) { closeMenu(); return; }
      openMenu(key, el);
    });
    el.addEventListener('mouseenter', () => {
      if (activeMenuItem && activeMenuItem !== el) openMenu(el.dataset.menu, el);
    });
  });

  // ─── Search bar ────────────────────────────────────────────────────────────
  const searchInput = document.getElementById('title-search-input');
  const searchBar   = document.getElementById('title-search-bar');

  if (searchInput) {
    searchBar.addEventListener('click', () => {
      searchInput.focus();
      waitForModule('CommandPalette', () => CommandPalette.show('files'));
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchInput.blur();
        searchInput.value = '';
        return;
      }
      if (e.key === 'Enter') {
        const val = searchInput.value.trim();
        waitForModule('CommandPalette', () => {
          CommandPalette.show(val.startsWith('>') ? 'commands' : 'files');
          setTimeout(() => {
            const pi = document.getElementById('command-palette-input');
            if (pi) { pi.value = val; pi.dispatchEvent(new Event('input')); }
          }, 20);
        });
        searchInput.value = '';
        searchInput.blur();
      }
    });

    document.addEventListener('keydown', (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && !e.shiftKey && e.key === 'p') {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
      if (ctrl && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        searchInput.focus();
        searchInput.value = '>';
        searchInput.dispatchEvent(new Event('input'));
      }
    });
  }

  // ─── Action buttons ────────────────────────────────────────────────────────
  function wireActionButtons() {
    const btnRun      = document.getElementById('tb-btn-run');
    const btnTerminal = document.getElementById('tb-btn-terminal');
    const btnSplit    = document.getElementById('tb-btn-split');
    const btnSettings = document.getElementById('tb-btn-settings');

    if (btnRun) btnRun.onclick = () => handleAction('run-file');
    if (btnTerminal) btnTerminal.onclick = () => handleAction('toggle-terminal');
    if (btnSplit) btnSplit.onclick = () => handleAction('split-editor');
    if (btnSettings) {
      btnSettings.onclick = () => {
        const settingsBtn = document.querySelector('.activity-btn[data-panel="settings"]');
        if (settingsBtn) settingsBtn.click();
      };
    }
  }

  // ─── Window controls ───────────────────────────────────────────────────────
  function wireWindowControls() {
    const btnMin   = document.getElementById('btn-minimize');
    const btnMax   = document.getElementById('btn-maximize');
    const btnClose = document.getElementById('btn-close');

    if (!btnMin || !btnMax || !btnClose) {
      setTimeout(wireWindowControls, 50);
      return;
    }

    if (!window.novagen || !window.novagen.window) {
      console.error('[titlebar] novagen bridge not available');
      return;
    }

    btnMin.onclick = () => window.novagen.window.minimize();
    btnMax.onclick = () => window.novagen.window.toggleMaximize();
    btnClose.onclick = async () => {
      waitForModule('TabManager', async () => {
        const dirty = TabManager.getTabs().filter(t => t.dirty);
        if (dirty.length > 0 && window.Modal) {
          const res = await Modal.confirm('Unsaved Changes',
            `You have ${dirty.length} unsaved file${dirty.length > 1 ? 's' : ''}. Save all before closing?`, 'Save All');
          if (res === true && window.EditorManager) {
            for (const t of dirty) await EditorManager.saveFile(t.id);
          }
        }
        window.novagen.window.close();
      });
    };

    window.novagen.window.onMaximized((isMax) => {
      btnMax.innerHTML = isMax
        ? `<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 0h8v8M0 2h8v8" stroke="currentColor" stroke-width="1"/></svg>`
        : `<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><rect width="9" height="9" x="0.5" y="0.5" stroke="currentColor" stroke-width="1"/></svg>`;
      btnMax.title = isMax ? 'Restore Down' : 'Maximize';
    });
  }

  // ─── Boot ──────────────────────────────────────────────────────────────────
  wireActionButtons();
  wireWindowControls();

})();
