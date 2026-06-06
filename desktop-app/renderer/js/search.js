/* ─── Search Panel ────────────────────────────────────────────────────────── */

const SearchPanel = (() => {
  const searchInput   = document.getElementById('search-input');
  const replaceInput  = document.getElementById('replace-input');
  const resultsEl     = document.getElementById('search-results');
  const btnRegex      = document.getElementById('btn-search-regex');
  const btnCase       = document.getElementById('btn-search-case');
  const btnWord       = document.getElementById('btn-search-word');
  const btnReplaceOne = document.getElementById('btn-replace-one');
  const btnReplaceAll = document.getElementById('btn-replace-all');

  let results = [];

  const search = Utils.debounce(async () => {
    const query = searchInput.value;
    if (!query || query.length < 2) {
      resultsEl.innerHTML = '';
      return;
    }

    const rootPath = FileTree.getRootPath();
    if (!rootPath) {
      resultsEl.innerHTML = '<div class="search-no-folder">Open a folder to search</div>';
      return;
    }

    resultsEl.innerHTML = '<div class="search-loading">Searching...</div>';
    results = await searchInDirectory(rootPath, query);
    renderResults();
  }, 300);

  async function searchInDirectory(dirPath, query, depth = 0) {
    if (depth > 10) return [];
    const found = [];

    let useRegex = btnRegex.dataset.active === 'true';
    let matchCase = btnCase.dataset.active === 'true';
    let wholeWord = btnWord.dataset.active === 'true';

    const result = await window.novagen.fs.readDirectory(dirPath);
    if (!result.success) return [];

    for (const entry of result.entries) {
      if (entry.isDirectory) {
        // Skip node_modules, .git, dist, build
        if (['node_modules', '.git', 'dist', 'build', '.next', '__pycache__'].includes(entry.name)) continue;
        const sub = await searchInDirectory(entry.path, query, depth + 1);
        found.push(...sub);
        if (found.length > 500) break;
      } else {
        const ext = Utils.getExtension(entry.name);
        const textExts = ['js','ts','jsx','tsx','html','css','scss','json','md','py','rs','go','java','c','cpp','h','cs','rb','php','sh','yml','yaml','toml','xml','txt','sql','vue','graphql'];
        if (!textExts.includes(ext) && !['dockerfile','makefile'].includes(entry.name.toLowerCase())) continue;

        try {
          const fileResult = await window.novagen.fs.readFile(entry.path);
          if (!fileResult.success) continue;

          const lines = fileResult.content.split('\n');
          lines.forEach((line, idx) => {
            let flags = useRegex ? '' : 'g';
            if (!matchCase) flags += 'i';

            let pattern;
            try {
              if (useRegex) {
                pattern = new RegExp(query + (wholeWord ? '\\b' : ''), flags + (matchCase ? '' : 'i'));
              } else {
                const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                pattern = new RegExp((wholeWord ? `\\b${escaped}\\b` : escaped), matchCase ? 'g' : 'gi');
              }
            } catch { return; }

            if (pattern.test(line)) {
              found.push({ file: entry.path, line: idx + 1, content: line.trim(), fileName: entry.name });
            }
          });
        } catch {}

        if (found.length > 500) break;
      }
    }

    return found;
  }

  function renderResults() {
    if (results.length === 0) {
      resultsEl.innerHTML = `<div style="color:var(--text-muted);font-size:12px;padding:8px">No results found</div>`;
      return;
    }

    // Group by file
    const byFile = {};
    results.forEach(r => {
      if (!byFile[r.file]) byFile[r.file] = { name: r.fileName, matches: [] };
      byFile[r.file].matches.push(r);
    });

    let html = `<div style="color:var(--text-muted);font-size:11px;padding:4px 0 8px">${results.length} result${results.length !== 1 ? 's' : ''}</div>`;

    for (const [filePath, data] of Object.entries(byFile)) {
      html += `
        <div class="search-file-group">
          <div class="search-file-name" data-path="${Utils.escapeHtml(filePath)}" title="${Utils.escapeHtml(filePath)}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;flex-shrink:0">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            ${Utils.escapeHtml(data.name)}
            <span style="margin-left:auto;opacity:.5">${data.matches.length}</span>
          </div>
          ${data.matches.map(m => `
            <div class="search-match" data-path="${Utils.escapeHtml(m.file)}" data-line="${m.line}">
              <span class="search-match-line">${m.line}</span>
              <span class="search-match-content">${Utils.escapeHtml(m.content.slice(0, 80))}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    resultsEl.innerHTML = html;

    // Click handlers
    resultsEl.querySelectorAll('.search-match').forEach(el => {
      el.addEventListener('click', () => {
        const path = el.dataset.path;
        const line = parseInt(el.dataset.line);
        EditorManager.openFile(path);
        // Try to jump to line after a short delay
        setTimeout(() => {
          const tabId = EditorManager.getCurrentTabId();
          if (tabId !== null) {
            // Monaco scroll to line
            try {
              const editor = window.__monacoEditor;
              if (editor) editor.revealLineInCenter(line);
            } catch {}
          }
        }, 300);
      });
    });

    resultsEl.querySelectorAll('.search-file-name').forEach(el => {
      el.addEventListener('click', () => EditorManager.openFile(el.dataset.path));
    });
  }

  // ─── Toggle buttons ───────────────────────────────────────────────────────
  [btnRegex, btnCase, btnWord].forEach(btn => {
    btn.addEventListener('click', () => {
      btn.dataset.active = btn.dataset.active === 'true' ? 'false' : 'true';
      search();
    });
  });

  searchInput.addEventListener('input', search);
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') search();
  });

  btnReplaceAll.addEventListener('click', async () => {
    const query   = searchInput.value;
    const replace = replaceInput.value;
    if (!query) return;

    let count = 0;
    const byFile = {};
    results.forEach(r => {
      if (!byFile[r.file]) byFile[r.file] = [];
      byFile[r.file].push(r);
    });

    for (const [filePath, matches] of Object.entries(byFile)) {
      const fr = await window.novagen.fs.readFile(filePath);
      if (!fr.success) continue;
      const newContent = fr.content.split('\n').map((line, idx) => {
        const match = matches.find(m => m.line === idx + 1);
        if (!match) return line;
        count++;
        return line.replaceAll(query, replace);
      }).join('\n');
      await window.novagen.fs.writeFile(filePath, newContent);
    }

    Notifications.success('Replace All', `Replaced ${count} occurrence${count !== 1 ? 's' : ''}`);
    search();
  });

  return { search };
})();

// Inject search result styles dynamically
const searchStyle = document.createElement('style');
searchStyle.textContent = `
.search-file-group { margin-bottom: 8px; }
.search-file-name {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 600; color: var(--text-secondary);
  padding: 4px 4px; cursor: pointer; border-radius: var(--radius);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.search-file-name:hover { background: var(--bg-hover); color: var(--text-primary); }
.search-match {
  display: flex; align-items: center; gap: 8px;
  padding: 2px 4px 2px 16px;
  cursor: pointer; border-radius: var(--radius);
  font-family: var(--font-mono); font-size: 12px;
}
.search-match:hover { background: var(--bg-hover); }
.search-match-line { color: var(--text-muted); min-width: 28px; text-align: right; flex-shrink: 0; }
.search-match-content { color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.search-loading { color: var(--text-muted); font-size: 12px; padding: 8px; }
`;
document.head.appendChild(searchStyle);
