/* ─── Integrated Terminal ─────────────────────────────────────────────────── */

const Terminal = (() => {
  const panel       = document.getElementById('terminal-panel');
  const output      = document.getElementById('terminal-output');
  const input       = document.getElementById('terminal-input');
  const promptEl    = document.getElementById('terminal-prompt');
  const resizeHandle = document.getElementById('terminal-resize-handle');
  const toggleBtn   = document.getElementById('btn-toggle-terminal');

  let cwd = null;
  let history = [];
  let historyIdx = -1;
  let isCollapsed = true;
  let activePanel = 'terminal'; // Default active panel

  // ─── Panel switching ──────────────────────────────────────────────────────
  function switchPanel(panelName) {
    activePanel = panelName;

    // Update tabs
    document.querySelectorAll('.panel-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.panel === panelName);
    });

    // Update content visibility
    document.querySelectorAll('.panel-content').forEach(content => {
      content.classList.toggle('active', content.id === `panel-${panelName}`);
    });

    // Show/hide terminal instance tabs
    const terminalTabs = document.getElementById('terminal-tabs');
    if (terminalTabs) {
      terminalTabs.classList.toggle('visible', panelName === 'terminal');
    }

    // Update button visibility/state
    const btnNew = document.getElementById('btn-new-terminal');
    const btnClear = document.getElementById('btn-clear-panel');
    
    if (btnNew) btnNew.style.display = panelName === 'terminal' ? '' : 'none';
    if (btnClear) btnClear.title = panelName === 'terminal' ? 'Clear Terminal' : 'Clear';
  }

  // Wire panel tabs
  document.querySelectorAll('.panel-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const panelName = tab.dataset.panel;
      switchPanel(panelName);
      if (isCollapsed) toggle(); // Auto-expand if collapsed
    });
  });

  // ─── Init ─────────────────────────────────────────────────────────────────

  function init(initialCwd) {
    cwd = initialCwd || null;
    updatePrompt();
    writeLine('EDITH Terminal  —  type "help" for commands', 'info');
    writeLine('', '');
  }

  // ─── Output ───────────────────────────────────────────────────────────────

  function writeLine(text, type = 'stdout') {
    const line = document.createElement('div');
    line.className = `terminal-line ${type}`;
    line.textContent = text;
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
  }

  function writeLines(text, type = 'stdout') {
    text.split('\n').forEach(l => writeLine(l, type));
  }

  function clear() {
    output.innerHTML = '';
  }

  function updatePrompt() {
    const dir = cwd ? cwd.split(/[/\\]/).pop() : '~';
    promptEl.textContent = `${dir} $ `;
  }

  // ─── Command Execution ────────────────────────────────────────────────────

  async function runCommand(cmd) {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    // History
    history.unshift(trimmed);
    if (history.length > 200) history.pop();
    historyIdx = -1;

    writeLine(`${promptEl.textContent}${trimmed}`, 'cmd');

    // Built-in commands
    if (trimmed === 'clear' || trimmed === 'cls') { clear(); return; }
    if (trimmed === 'help') { showHelp(); return; }
    if (trimmed.startsWith('cd ')) {
      await handleCd(trimmed.slice(3).trim());
      return;
    }
    if (trimmed === 'pwd') { writeLine(cwd || '~', 'stdout'); return; }
    if (trimmed === 'ls' || trimmed === 'dir') { await handleLs(); return; }

    // Execute via shell
    await executeShell(trimmed);
  }

  async function handleCd(target) {
    let newPath;
    if (!target || target === '~') {
      // Home dir
      const home = await window.novagen.path.getHomeDir();
      newPath = home;
    } else if (target.match(/^[A-Za-z]:\\/)) {
      newPath = target;
    } else {
      newPath = cwd ? `${cwd}\\${target}` : target;
    }

    const exists = await window.novagen.fs.pathExists(newPath);
    if (exists) {
      cwd = newPath;
      updatePrompt();
    } else {
      writeLine(`cd: no such directory: ${target}`, 'stderr');
    }
  }

  async function handleLs() {
    if (!cwd) { writeLine('No directory set.', 'warn'); return; }
    const result = await window.novagen.fs.readDirectory(cwd);
    if (!result.success) { writeLine(result.error, 'stderr'); return; }
    const names = result.entries.map(e => e.isDirectory ? e.name + '/' : e.name);
    writeLine(names.join('  ') || '(empty)', 'stdout');
  }

  async function executeShell(cmd) {
    // We run commands via a simple approach using IPC would need node-pty
    // For the renderer, we simulate basic output for built-ins
    // A real implementation would use IPC to spawn processes in main
    writeLine(`[shell] Command execution requires the app to be built with node-pty.`, 'warn');
    writeLine(`[shell] In development, run: ${cmd}`, 'info');
    writeLine(`[hint]  Open a system terminal for full shell access.`, 'info');
  }

  function showHelp() {
    const lines = [
      'EDITH Terminal — built-in commands:',
      '  clear / cls    Clear the terminal',
      '  cd <path>      Change directory',
      '  pwd            Print working directory',
      '  ls / dir       List directory contents',
      '  help           Show this help',
      '',
      'For full shell access, use an external terminal.',
    ];
    lines.forEach(l => writeLine(l, 'info'));
  }

  // ─── Input Handling ───────────────────────────────────────────────────────

  input.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      const cmd = input.value;
      input.value = '';
      historyIdx = -1;
      await runCommand(cmd);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIdx < history.length - 1) {
        historyIdx++;
        input.value = history[historyIdx];
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx > 0) {
        historyIdx--;
        input.value = history[historyIdx];
      } else {
        historyIdx = -1;
        input.value = '';
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      clear();
    } else if (e.key === 'c' && e.ctrlKey) {
      e.preventDefault();
      writeLine('^C', 'warn');
      input.value = '';
    }
  });

  // Focus terminal input when panel body clicked
  document.getElementById('terminal-body').addEventListener('click', () => {
    if (!isCollapsed) input.focus();
  });

  // ─── Toggle / Resize ──────────────────────────────────────────────────────

  function toggle() {
    isCollapsed = !isCollapsed;
    panel.classList.toggle('collapsed', isCollapsed);
    toggleBtn.innerHTML = isCollapsed
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>`;
    if (!isCollapsed) { input.focus(); EditorManager.layout(); }
    else EditorManager.layout();
  }

  function show() {
    if (isCollapsed) toggle();
  }

  document.getElementById('btn-toggle-terminal').addEventListener('click', toggle);

  document.getElementById('btn-new-terminal').addEventListener('click', () => {
    if (isCollapsed) toggle();
    clear();
    writeLine('New terminal session started.', 'info');
    input.focus();
  });

  document.getElementById('btn-clear-panel').addEventListener('click', () => {
    if (activePanel === 'terminal') {
      clear();
      writeLine('Terminal cleared.', 'info');
    } else if (activePanel === 'output') {
      document.getElementById('output-text').textContent = 'Output cleared.\n';
    } else if (activePanel === 'problems') {
      // Clear problems list
    }
  });

  document.getElementById('btn-split-terminal').addEventListener('click', () => {
    if (window.Notifications) Notifications.info('Split Terminal', 'Split terminal coming soon.');
  });

  // Terminal resize drag
  let resizing = false, startY = 0, startH = 0;
  resizeHandle.addEventListener('mousedown', (e) => {
    resizing = true;
    startY = e.clientY;
    startH = panel.offsetHeight;
    resizeHandle.classList.add('dragging');
    e.preventDefault();
  });
  document.addEventListener('mousemove', (e) => {
    if (!resizing) return;
    const delta = startY - e.clientY;
    const newH = Math.max(80, Math.min(600, startH + delta));
    panel.style.height = `${newH}px`;
    EditorManager.layout();
  });
  document.addEventListener('mouseup', () => {
    if (resizing) { resizing = false; resizeHandle.classList.remove('dragging'); }
  });

  // ─── Set working directory ────────────────────────────────────────────────
  function setCwd(path) {
    cwd = path;
    updatePrompt();
  }

  return { init, writeLine, writeLines, clear, toggle, show, setCwd, runCommand, switchPanel, get isCollapsed() { return isCollapsed; } };
})();

// Expose to window for other modules
window.Terminal = Terminal;
