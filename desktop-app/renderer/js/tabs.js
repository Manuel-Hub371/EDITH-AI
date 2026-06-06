/* ─── Tab Manager ─────────────────────────────────────────────────────────── */

const TabManager = (() => {
  const tabsList = document.getElementById('tabs-list');
  const breadcrumb = document.getElementById('breadcrumb-path');

  let tabs = [];       // [{ id, path, name, dirty }]
  let activeId = null;

  // ─── Public API ──────────────────────────────────────────────────────────

  function openTab(filePath, fileName) {
    // Check if already open
    const existing = tabs.find(t => t.path === filePath);
    if (existing) {
      setActive(existing.id);
      return existing.id;
    }
    const id = Utils.uid();
    tabs.push({ id, path: filePath, name: fileName, dirty: false });
    render();
    setActive(id);
    return id;
  }

  function closeTab(id) {
    const idx = tabs.findIndex(t => t.id === id);
    if (idx < 0) return;
    tabs.splice(idx, 1);
    if (activeId === id) {
      // Activate nearest tab
      const next = tabs[Math.min(idx, tabs.length - 1)];
      activeId = next ? next.id : null;
      if (next) EditorManager.activateTab(next.id, next.path);
      else EditorManager.showWelcome();
    }
    render();
  }

  function setActive(id) {
    activeId = id;
    render();
    const tab = tabs.find(t => t.id === id);
    if (tab) updateBreadcrumb(tab.path);
  }

  function markDirty(id, dirty) {
    const tab = tabs.find(t => t.id === id);
    if (tab) { tab.dirty = dirty; render(); }
  }

  function getActive() { return tabs.find(t => t.id === activeId) || null; }
  function getTab(id)  { return tabs.find(t => t.id === id) || null; }
  function getTabByPath(path) { return tabs.find(t => t.path === path) || null; }
  function getTabs() { return [...tabs]; }

  function onPathRenamed(oldPath, newPath) {
    tabs.forEach(t => {
      if (t.path === oldPath) {
        t.path = newPath;
        t.name = newPath.split(/[/\\]/).pop();
      }
    });
    render();
  }

  function updateTab(id, newPath, newName) {
    const tab = tabs.find(t => t.id === id);
    if (tab) {
      tab.path = newPath;
      tab.name = newName;
      render();
      if (activeId === id) updateBreadcrumb(newPath);
    }
  }

  function onPathDeleted(path) {
    const tab = tabs.find(t => t.path === path);
    if (tab) closeTab(tab.id);
  }

  // ─── Rendering ───────────────────────────────────────────────────────────

  function render() {
    tabsList.innerHTML = '';
    tabs.forEach(tab => {
      const el = document.createElement('div');
      el.className = `tab${tab.id === activeId ? ' active' : ''}`;
      el.dataset.id = tab.id;

      const langId = Utils.getLanguageId(tab.name);
      el.innerHTML = `
        <span class="tab-name" title="${Utils.escapeHtml(tab.path)}">${Utils.escapeHtml(tab.name)}</span>
        ${tab.dirty ? '<span class="tab-dirty">•</span>' : ''}
        <span class="tab-close" title="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </span>
      `;

      el.addEventListener('click', (e) => {
        if (e.target.closest('.tab-close')) return;
        setActive(tab.id);
        EditorManager.activateTab(tab.id, tab.path);
      });

      el.addEventListener('mousedown', (e) => {
        if (e.button === 1) { // Middle click
          e.preventDefault();
          closeTab(tab.id);
        }
      });

      el.querySelector('.tab-close').addEventListener('click', async (e) => {
        e.stopPropagation();
        if (tab.dirty) {
          const res = await Modal.confirm('Unsaved Changes', `"${tab.name}" has unsaved changes. Save before closing?`, 'Save');
          if (res === true) await EditorManager.saveFile(tab.id);
        }
        closeTab(tab.id);
        EditorManager.destroyTab(tab.id);
      });

      // Context menu on tab
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        ContextMenu.show(e.clientX, e.clientY, [
          { label: 'Close',             action: () => closeTab(tab.id) },
          { label: 'Close Others',      action: () => closeOthers(tab.id) },
          { label: 'Close All',         action: () => closeAll() },
          { separator: true },
          { label: 'Copy Path',         action: () => { navigator.clipboard.writeText(tab.path); } },
          { label: 'Reveal in Explorer',action: () => revealInExplorer(tab.path) },
        ]);
      });

      tabsList.appendChild(el);
    });
  }

  function updateBreadcrumb(filePath) {
    const parts = filePath.replace(/\\/g, '/').split('/');
    breadcrumb.innerHTML = parts.map((part, i) => {
      const isLast = i === parts.length - 1;
      return `
        ${i > 0 ? '<span class="breadcrumb-sep">/</span>' : ''}
        <span class="breadcrumb-item">${Utils.escapeHtml(part)}</span>
      `;
    }).join('');
  }

  function closeOthers(keepId) {
    const toClose = tabs.filter(t => t.id !== keepId);
    toClose.forEach(t => { closeTab(t.id); EditorManager.destroyTab(t.id); });
  }

  function closeAll() {
    const toClose = [...tabs];
    toClose.forEach(t => { EditorManager.destroyTab(t.id); });
    tabs = [];
    activeId = null;
    render();
    EditorManager.showWelcome();
  }

  function revealInExplorer(filePath) {
    // Scroll to and highlight in file tree
    const el = document.querySelector(`[data-path="${CSS.escape(filePath)}"]`);
    if (el) {
      el.scrollIntoView({ block: 'nearest' });
      el.classList.add('active');
    }
  }

  return {
    openTab, closeTab, setActive, markDirty,
    getActive, getTab, getTabByPath, getTabs,
    onPathRenamed, onPathDeleted, updateTab,
  };
})();

// Expose to window for other modules
window.TabManager = TabManager;
