/* ─── Utility Functions ───────────────────────────────────────────────────── */

const Utils = (() => {
  /**
   * Debounce a function call
   */
  function debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  /**
   * Get file extension (lowercase, no dot)
   */
  function getExtension(filename) {
    const idx = filename.lastIndexOf('.');
    if (idx < 0) return '';
    return filename.slice(idx + 1).toLowerCase();
  }

  /**
   * Get language ID for Monaco from filename
   */
  function getLanguageId(filename) {
    const ext = getExtension(filename);
    const map = {
      js: 'javascript', mjs: 'javascript', cjs: 'javascript',
      jsx: 'javascript',
      ts: 'typescript', tsx: 'typescript', mts: 'typescript',
      html: 'html', htm: 'html',
      css: 'css', scss: 'scss', less: 'less',
      json: 'json', jsonc: 'json',
      md: 'markdown', mdx: 'markdown',
      py: 'python',
      rs: 'rust',
      go: 'go',
      java: 'java',
      c: 'c',
      cpp: 'cpp', cc: 'cpp', cxx: 'cpp', h: 'cpp', hpp: 'cpp',
      cs: 'csharp',
      rb: 'ruby',
      php: 'php',
      sh: 'shell', bash: 'shell', zsh: 'shell',
      yml: 'yaml', yaml: 'yaml',
      toml: 'ini',
      xml: 'xml', svg: 'xml',
      sql: 'sql',
      dockerfile: 'dockerfile',
      graphql: 'graphql', gql: 'graphql',
      tf: 'hcl',
      lua: 'lua',
      r: 'r',
      dart: 'dart',
      swift: 'swift',
      kt: 'kotlin', kts: 'kotlin',
      vue: 'html',
    };
    // special filenames
    const lower = filename.toLowerCase();
    if (lower === 'dockerfile') return 'dockerfile';
    if (lower === 'makefile') return 'makefile';
    return map[ext] || 'plaintext';
  }

  /**
   * Get friendly language display name
   */
  function getLanguageName(filename) {
    const ext = getExtension(filename);
    const map = {
      js: 'JavaScript', mjs: 'JavaScript', jsx: 'JavaScript (JSX)',
      ts: 'TypeScript', tsx: 'TypeScript (TSX)',
      html: 'HTML', htm: 'HTML',
      css: 'CSS', scss: 'SCSS', less: 'Less',
      json: 'JSON', jsonc: 'JSON with Comments',
      md: 'Markdown', mdx: 'MDX',
      py: 'Python',
      rs: 'Rust',
      go: 'Go',
      java: 'Java',
      c: 'C', cpp: 'C++', cc: 'C++', h: 'C/C++ Header',
      cs: 'C#',
      rb: 'Ruby', php: 'PHP',
      sh: 'Shell Script', bash: 'Bash',
      yml: 'YAML', yaml: 'YAML',
      toml: 'TOML',
      xml: 'XML', svg: 'SVG',
      sql: 'SQL',
      graphql: 'GraphQL', gql: 'GraphQL',
      lua: 'Lua', r: 'R', dart: 'Dart', swift: 'Swift',
      kt: 'Kotlin',
      vue: 'Vue',
    };
    const lower = filename.toLowerCase();
    if (lower === 'dockerfile') return 'Dockerfile';
    if (lower === 'makefile') return 'Makefile';
    return map[ext] || 'Plain Text';
  }

  /**
   * Build an SVG icon for a file/folder
   */
  function getFileIcon(name, isDirectory, isOpen = false) {
    if (isDirectory) {
      if (isOpen) {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="icon-dir">
          <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 2h9a2 2 0 012 2z"/>
          <line x1="2" y1="10" x2="22" y2="10"/>
        </svg>`;
      }
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="icon-dir">
        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 2h9a2 2 0 012 2z"/>
      </svg>`;
    }
    const ext = getExtension(name);
    const lower = name.toLowerCase();
    const icons = {
      js:   `<svg viewBox="0 0 24 24" fill="currentColor" class="icon-js"><text x="3" y="18" font-size="14" font-weight="bold" font-family="monospace">JS</text></svg>`,
      ts:   `<svg viewBox="0 0 24 24" fill="currentColor" class="icon-ts"><text x="3" y="18" font-size="14" font-weight="bold" font-family="monospace">TS</text></svg>`,
      jsx:  `<svg viewBox="0 0 24 24" fill="currentColor" class="icon-jsx"><text x="1" y="18" font-size="12" font-weight="bold" font-family="monospace">JSX</text></svg>`,
      tsx:  `<svg viewBox="0 0 24 24" fill="currentColor" class="icon-tsx"><text x="1" y="18" font-size="12" font-weight="bold" font-family="monospace">TSX</text></svg>`,
    };
    if (icons[ext]) return icons[ext];

    // Generic file icon with colored dot
    const colorMap = {
      html: 'icon-html', htm: 'icon-html',
      css: 'icon-css', scss: 'icon-scss',
      json: 'icon-json', jsonc: 'icon-json',
      md: 'icon-md',
      py: 'icon-py',
      rs: 'icon-rs',
      go: 'icon-go',
      java: 'icon-java',
      cpp: 'icon-cpp', cc: 'icon-cpp', c: 'icon-c', h: 'icon-c',
      sh: 'icon-sh', bash: 'icon-sh',
      yml: 'icon-yml', yaml: 'icon-yaml',
      toml: 'icon-toml',
      svg: 'icon-img', png: 'icon-img', jpg: 'icon-img', jpeg: 'icon-img', gif: 'icon-img', webp: 'icon-img',
    };
    if (lower === 'dockerfile') return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="icon-txt"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
    if (lower.startsWith('.git')) return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="icon-git"><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><path d="M6 8.5v7M8.5 6h7M13.5 8l3 3"/></svg>`;

    const cls = colorMap[ext] || 'icon-txt';
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="${cls}"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
  }

  /**
   * Format bytes to human-readable string
   */
  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Escape HTML special characters
   */
  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Generate a unique ID
   */
  let _uid = 0;
  function uid() { return ++_uid; }

  return { debounce, getExtension, getLanguageId, getLanguageName, getFileIcon, formatBytes, escapeHtml, uid };
})();
