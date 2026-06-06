/* ─── Modal ───────────────────────────────────────────────────────────────── */

const Modal = (() => {
  const overlay = document.getElementById('modal-overlay');
  const titleEl = document.getElementById('modal-title');
  const bodyEl  = document.getElementById('modal-body');
  const btnConfirm = document.getElementById('modal-confirm');
  const btnCancel  = document.getElementById('modal-cancel');

  let _resolve = null;

  function open({ title, body, confirmText = 'OK', cancelText = 'Cancel', hideCancel = false }) {
    titleEl.textContent = title || '';
    bodyEl.innerHTML = body || '';
    btnConfirm.textContent = confirmText;
    btnCancel.textContent  = cancelText;
    btnCancel.style.display = hideCancel ? 'none' : '';
    overlay.classList.remove('hidden');

    // Focus first input if any
    const input = bodyEl.querySelector('input');
    if (input) setTimeout(() => input.focus(), 50);

    return new Promise((resolve) => {
      _resolve = resolve;
    });
  }

  function close(value) {
    overlay.classList.add('hidden');
    if (_resolve) { _resolve(value); _resolve = null; }
  }

  btnConfirm.addEventListener('click', () => {
    const input = bodyEl.querySelector('input');
    close(input ? input.value : true);
  });

  btnCancel.addEventListener('click', () => close(null));

  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) close(null);
  });

  document.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('hidden')) {
      if (e.key === 'Escape') close(null);
      if (e.key === 'Enter') {
        const input = bodyEl.querySelector('input');
        close(input ? input.value : true);
      }
    }
  });

  /**
   * Show an input prompt
   */
  async function prompt(title, placeholder = '', defaultValue = '') {
    return open({
      title,
      body: `<input type="text" placeholder="${Utils.escapeHtml(placeholder)}" value="${Utils.escapeHtml(defaultValue)}" style="width:100%;padding:6px 10px;margin-top:4px" />`,
    });
  }

  /**
   * Show a confirmation dialog
   */
  async function confirm(title, message, confirmText = 'Confirm', danger = false) {
    return open({
      title,
      body: `<p>${Utils.escapeHtml(message)}</p>`,
      confirmText,
    });
  }

  /**
   * Show an alert (info only, no cancel)
   */
  async function alert(title, message) {
    return open({ title, body: `<p>${Utils.escapeHtml(message)}</p>`, hideCancel: true });
  }

  return { open, close, prompt, confirm, alert };
})();

// Expose to window for other modules
window.Modal = Modal;
