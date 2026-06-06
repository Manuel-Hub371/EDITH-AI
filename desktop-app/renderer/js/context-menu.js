/* ─── Context Menu ────────────────────────────────────────────────────────── */

const ContextMenu = (() => {
  const menu = document.getElementById('context-menu');
  const list = document.getElementById('context-menu-list');
  let _onClose = null;

  function show(x, y, items) {
    list.innerHTML = '';

    items.forEach((item) => {
      if (item.separator) {
        const sep = document.createElement('li');
        sep.className = 'ctx-separator';
        list.appendChild(sep);
        return;
      }

      const li = document.createElement('li');
      li.className = `ctx-item${item.danger ? ' danger' : ''}${item.disabled ? ' disabled' : ''}`;
      li.innerHTML = `
        ${item.icon ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${item.icon}</svg>` : ''}
        <span>${Utils.escapeHtml(item.label)}</span>
        ${item.key ? `<span class="ctx-item-key">${item.key}</span>` : ''}
      `;
      if (!item.disabled) {
        li.addEventListener('click', () => {
          close();
          if (item.action) item.action();
        });
      }
      list.appendChild(li);
    });

    menu.classList.remove('hidden');

    // Position within viewport
    const menuWidth = 200;
    const menuHeight = list.children.length * 30 + 10;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = x, top = y;
    if (left + menuWidth > vw) left = vw - menuWidth - 8;
    if (top + menuHeight > vh) top = vh - menuHeight - 8;
    menu.style.left = `${left}px`;
    menu.style.top  = `${top}px`;
  }

  function close() {
    menu.classList.add('hidden');
    if (_onClose) { _onClose(); _onClose = null; }
  }

  // Close on outside click
  document.addEventListener('mousedown', (e) => {
    if (!menu.contains(e.target)) close();
  });

  // Close on escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  return { show, close };
})();
