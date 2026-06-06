/* ─── Status Bar ──────────────────────────────────────────────────────────── */

const StatusBar = (() => {
  const cursorEl   = document.getElementById('status-cursor');
  const langEl     = document.getElementById('status-language');
  const spacesEl   = document.getElementById('status-spaces');
  const encodingEl = document.getElementById('status-encoding');
  const eolEl      = document.getElementById('status-eol');
  const errorsEl   = document.getElementById('status-errors');

  function setCursor(line, col) {
    cursorEl.textContent = `Ln ${line}, Col ${col}`;
  }

  function setLanguage(lang) {
    langEl.textContent = lang || 'Plain Text';
  }

  function setSpaces(n) {
    spacesEl.textContent = `Spaces: ${n}`;
  }

  function setEncoding(enc) {
    encodingEl.textContent = enc || 'UTF-8';
  }

  function setEol(eol) {
    eolEl.textContent = eol || 'LF';
  }

  function setErrors(errors, warnings) {
    const errSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    const warnSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    errorsEl.innerHTML = `${errSvg} ${errors} ${warnSvg} ${warnings}`;
  }

  // Clickable items
  langEl.addEventListener('click', () => {
    CommandPalette.show('language');
  });

  spacesEl.addEventListener('click', async () => {
    const val = await Modal.prompt('Tab Size', 'Enter tab size (1-8)', '2');
    const n = parseInt(val);
    if (!isNaN(n) && n >= 1 && n <= 8) {
      setSpaces(n);
      EditorManager.applySettings({ tabSize: n });
    }
  });

  return { setCursor, setLanguage, setSpaces, setEncoding, setEol, setErrors };
})();
