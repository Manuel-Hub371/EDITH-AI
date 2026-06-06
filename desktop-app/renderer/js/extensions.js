/* ─── Extensions Manager (Open VSX) ───────────────────────────────────────── */

const ExtensionsManager = (() => {
  const OPENVSX_API = 'https://open-vsx.org/api';
  const CACHE_KEY = 'edith-extensions';
  
  let installedExtensions = [];
  let searchResults = [];
  let currentPage = 0;
  let isLoading = false;

  // DOM Elements
  let searchInput, extensionsList, searchBtn;

  // ─── Init ─────────────────────────────────────────────────────────────────

  function init() {
    searchInput = document.getElementById('ext-search');
    extensionsList = document.getElementById('extensions-list');
    
    // Load installed extensions from localStorage
    loadInstalledExtensions();

    // Event listeners
    if (searchInput) {
      searchInput.addEventListener('input', debounce(handleSearch, 500));
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSearch();
      });
    }

    // Render initial state
    renderExtensions();

    console.log('[ExtensionsManager] Initialized with Open VSX');
  }

  // ─── Search Extensions ────────────────────────────────────────────────────

  async function handleSearch() {
    const query = searchInput.value.trim();
    
    if (!query) {
      renderExtensions();
      return;
    }

    if (isLoading) return;
    isLoading = true;

    try {
      showLoading();
      const results = await searchExtensions(query);
      searchResults = results;
      renderSearchResults(results);
    } catch (error) {
      console.error('[ExtensionsManager] Search error:', error);
      showError('Failed to search extensions. Please check your internet connection.');
    } finally {
      isLoading = false;
    }
  }

  async function searchExtensions(query, size = 20) {
    const url = `${OPENVSX_API}/-/search?query=${encodeURIComponent(query)}&size=${size}&offset=0`;
    
    if (!window.edith || !window.edith.openVsx) {
      throw new Error('Open VSX bridge not available');
    }

    const result = await window.edith.openVsx.fetch(url);
    
    if (!result.ok) {
      throw new Error(`Open VSX API error: ${result.status} - ${result.error || 'Unknown error'}`);
    }

    return result.data.extensions || [];
  }

  // ─── Featured/Popular Extensions ──────────────────────────────────────────

  async function loadFeaturedExtensions() {
    if (!window.edith || !window.edith.openVsx) {
      console.warn('[ExtensionsManager] edith.openVsx bridge not available, using built-in list');
      return getBuiltInFeatured();
    }

    try {
      // Get popular extensions from Open VSX by category
      const categories = ['Programming Languages', 'Themes', 'Linters', 'Formatters'];
      const featured = [];

      for (const category of categories) {
        const url = `${OPENVSX_API}/-/search?category=${encodeURIComponent(category)}&size=5&sortBy=downloadCount`;
        const result = await window.edith.openVsx.fetch(url);
        
        if (result.ok && result.data && result.data.extensions) {
          featured.push(...result.data.extensions);
        }
      }

      if (featured.length === 0) {
        console.warn('[ExtensionsManager] No results from API, using built-in list');
        return getBuiltInFeatured();
      }

      return featured.slice(0, 20); // Top 20
    } catch (error) {
      console.error('[ExtensionsManager] Failed to load featured extensions:', error);
      return getBuiltInFeatured();
    }
  }

  // Curated fallback list when API is unreachable
  function getBuiltInFeatured() {
    return [
      { namespace: 'ms-python', name: 'python', displayName: 'Python', description: 'IntelliSense, linting, debugging for Python', version: '2024.0.0', downloadCount: 120000000, files: {} },
      { namespace: 'redhat', name: 'java', displayName: 'Language Support for Java', description: 'Java IntelliSense powered by Eclipse JDT', version: '1.28.0', downloadCount: 45000000, files: {} },
      { namespace: 'rust-lang', name: 'rust-analyzer', displayName: 'rust-analyzer', description: 'Rust language server', version: '0.3.1900', downloadCount: 20000000, files: {} },
      { namespace: 'vadimcn', name: 'vscode-lldb', displayName: 'CodeLLDB', description: 'LLDB debugger for C/C++/Rust', version: '1.10.0', downloadCount: 8000000, files: {} },
      { namespace: 'esbenp', name: 'prettier-vscode', displayName: 'Prettier', description: 'Code formatter using prettier', version: '11.0.0', downloadCount: 90000000, files: {} },
      { namespace: 'dbaeumer', name: 'vscode-eslint', displayName: 'ESLint', description: 'Integrates ESLint into VS Code', version: '2.4.4', downloadCount: 80000000, files: {} },
      { namespace: 'PKief', name: 'material-icon-theme', displayName: 'Material Icon Theme', description: 'Material Design Icons for VS Code', version: '5.4.0', downloadCount: 55000000, files: {} },
      { namespace: 'eamodio', name: 'gitlens', displayName: 'GitLens', description: 'Supercharge Git within VS Code', version: '15.0.0', downloadCount: 50000000, files: {} },
      { namespace: 'formulahendry', name: 'code-runner', displayName: 'Code Runner', description: 'Run code snippet or code file', version: '0.12.2', downloadCount: 30000000, files: {} },
      { namespace: 'ms-vscode', name: 'cpptools', displayName: 'C/C++', description: 'C/C++ IntelliSense, debugging, code browsing', version: '1.20.0', downloadCount: 60000000, files: {} },
    ];
  }

  // ─── Install/Uninstall Extensions ─────────────────────────────────────────

  async function installExtension(extension) {
    try {
      // In a real implementation, you would:
      // 1. Download the VSIX file from extension.files.download
      // 2. Extract and install the extension
      // 3. Register with Monaco Editor or IDE
      
      // For now, we'll simulate installation
      const installed = {
        id: `${extension.namespace}.${extension.name}`,
        name: extension.displayName || extension.name,
        namespace: extension.namespace,
        version: extension.version,
        description: extension.description,
        icon: extension.files?.icon || null,
        installedAt: Date.now(),
      };

      installedExtensions.push(installed);
      saveInstalledExtensions();

      Notifications.success('Extension Installed', `${installed.name} has been installed`);
      renderExtensions();

      console.log(`[ExtensionsManager] Installed: ${installed.id}`);
    } catch (error) {
      console.error('[ExtensionsManager] Install error:', error);
      Notifications.error('Installation Failed', error.message);
    }
  }

  async function uninstallExtension(extensionId) {
    const ext = installedExtensions.find(e => e.id === extensionId);
    if (!ext) return;

    const confirmed = await Modal.confirm(
      'Uninstall Extension',
      `Are you sure you want to uninstall "${ext.name}"?`,
      'Uninstall'
    );

    if (!confirmed) return;

    installedExtensions = installedExtensions.filter(e => e.id !== extensionId);
    saveInstalledExtensions();

    Notifications.success('Extension Uninstalled', `${ext.name} has been removed`);
    renderExtensions();

    console.log(`[ExtensionsManager] Uninstalled: ${extensionId}`);
  }

  // ─── Extension Details ────────────────────────────────────────────────────

  async function showExtensionDetails(extension) {
    const isInstalled = installedExtensions.some(e => 
      e.id === `${extension.namespace}.${extension.name}`
    );

    const modalBody = `
      <div style="display: flex; gap: 16px;">
        ${extension.files?.icon ? `
          <img src="${extension.files.icon}" 
               alt="${extension.displayName}" 
               style="width: 80px; height: 80px; border-radius: 8px; flex-shrink: 0;">
        ` : `
          <div style="width: 80px; height: 80px; background: var(--bg-tertiary); 
                      border-radius: 8px; display: flex; align-items: center; 
                      justify-content: center; font-size: 24px; font-weight: bold;
                      color: var(--accent); flex-shrink: 0;">
            ${(extension.displayName || extension.name).charAt(0).toUpperCase()}
          </div>
        `}
        <div style="flex: 1; min-width: 0;">
          <h3 style="margin: 0 0 8px 0; color: var(--text-primary);">
            ${extension.displayName || extension.name}
          </h3>
          <p style="margin: 0 0 8px 0; color: var(--text-secondary); font-size: 12px;">
            by ${extension.namespace}
          </p>
          <p style="margin: 0 0 12px 0; color: var(--text-primary); font-size: 13px; line-height: 1.6;">
            ${extension.description || 'No description available'}
          </p>
          <div style="display: flex; gap: 12px; flex-wrap: wrap; font-size: 12px; color: var(--text-muted);">
            <span>📦 Version: ${extension.version}</span>
            <span>⬇️ Downloads: ${formatNumber(extension.downloadCount || 0)}</span>
            ${extension.averageRating ? `<span>⭐ Rating: ${extension.averageRating.toFixed(1)}</span>` : ''}
          </div>
        </div>
      </div>
    `;

    const action = isInstalled ? 'Uninstall' : 'Install';
    const result = await Modal.confirm(
      'Extension Details',
      modalBody,
      action
    );

    if (result) {
      if (isInstalled) {
        await uninstallExtension(`${extension.namespace}.${extension.name}`);
      } else {
        await installExtension(extension);
      }
    }
  }

  // ─── Rendering ────────────────────────────────────────────────────────────

  function renderExtensions() {
    if (!extensionsList) return;

    extensionsList.innerHTML = `
      <div class="ext-section-title">Installed (${installedExtensions.length})</div>
      ${renderInstalledExtensions()}
      
      <div class="ext-section-title" style="margin-top: 16px;">
        Recommended
        <button class="ext-refresh-btn" id="btn-refresh-featured" title="Refresh">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
            <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
          </svg>
        </button>
      </div>
      <div id="featured-extensions">
        <div class="ext-loading">Loading recommended extensions...</div>
      </div>
    `;

    // Add event listeners for installed extensions
    document.querySelectorAll('.ext-uninstall-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        uninstallExtension(btn.dataset.id);
      });
    });

    // Load featured extensions
    const refreshBtn = document.getElementById('btn-refresh-featured');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', loadAndRenderFeatured);
    }

    loadAndRenderFeatured();
  }

  function renderInstalledExtensions() {
    if (installedExtensions.length === 0) {
      return '<div class="ext-empty">No extensions installed yet</div>';
    }

    return installedExtensions.map(ext => `
      <div class="extension-item" data-id="${ext.id}">
        ${ext.icon ? `
          <img src="${ext.icon}" class="ext-icon-img" alt="${ext.name}">
        ` : `
          <div class="ext-icon" style="background: var(--accent); color: #fff;">
            ${ext.name.charAt(0).toUpperCase()}
          </div>
        `}
        <div class="ext-info">
          <div class="ext-name">${ext.name}</div>
          <div class="ext-desc">${ext.description || 'No description'}</div>
          <div class="ext-version">v${ext.version}</div>
        </div>
        <button class="ext-uninstall-btn" data-id="${ext.id}">Uninstall</button>
      </div>
    `).join('');
  }

  async function loadAndRenderFeatured() {
    const container = document.getElementById('featured-extensions');
    if (!container) return;

    container.innerHTML = '<div class="ext-loading">Loading...</div>';

    try {
      const featured = await loadFeaturedExtensions();
      
      if (featured.length === 0) {
        container.innerHTML = '<div class="ext-empty">No extensions found</div>';
        return;
      }

      container.innerHTML = featured.map(ext => {
        const isInstalled = installedExtensions.some(e => 
          e.id === `${ext.namespace}.${ext.name}`
        );

        return `
          <div class="extension-item" data-namespace="${ext.namespace}" data-name="${ext.name}">
            ${ext.files?.icon ? `
              <img src="${ext.files.icon}" class="ext-icon-img" alt="${ext.displayName}">
            ` : `
              <div class="ext-icon" style="background: ${getRandomColor()}; color: #fff;">
                ${(ext.displayName || ext.name).charAt(0).toUpperCase()}
              </div>
            `}
            <div class="ext-info">
              <div class="ext-name">${ext.displayName || ext.name}</div>
              <div class="ext-desc">${(ext.description || '').substring(0, 60)}${ext.description?.length > 60 ? '...' : ''}</div>
              <div class="ext-meta">
                <span>by ${ext.namespace}</span>
                <span>⬇️ ${formatNumber(ext.downloadCount || 0)}</span>
              </div>
            </div>
            ${isInstalled ? 
              '<div class="ext-badge installed">✓ Installed</div>' :
              '<button class="ext-install-btn">Install</button>'
            }
          </div>
        `;
      }).join('');

      // Add click handlers
      container.querySelectorAll('.extension-item').forEach(item => {
        item.addEventListener('click', async () => {
          const namespace = item.dataset.namespace;
          const name = item.dataset.name;
          const ext = featured.find(e => e.namespace === namespace && e.name === name);
          if (ext) await showExtensionDetails(ext);
        });
      });

      container.querySelectorAll('.ext-install-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const item = btn.closest('.extension-item');
          const namespace = item.dataset.namespace;
          const name = item.dataset.name;
          const ext = featured.find(e => e.namespace === namespace && e.name === name);
          if (ext) await installExtension(ext);
        });
      });

    } catch (error) {
      console.error('[ExtensionsManager] Failed to load featured:', error);
      container.innerHTML = '<div class="ext-error">Failed to load extensions</div>';
    }
  }

  function renderSearchResults(results) {
    if (!extensionsList) return;

    if (results.length === 0) {
      extensionsList.innerHTML = `
        <div class="ext-empty">
          <p>No extensions found</p>
          <button class="secondary-btn" id="btn-clear-search">Clear Search</button>
        </div>
      `;
      document.getElementById('btn-clear-search')?.addEventListener('click', () => {
        searchInput.value = '';
        renderExtensions();
      });
      return;
    }

    extensionsList.innerHTML = `
      <div class="ext-section-title">
        Search Results (${results.length})
        <button class="ext-refresh-btn" id="btn-clear-search" title="Clear">×</button>
      </div>
      ${results.map(ext => {
        const isInstalled = installedExtensions.some(e => 
          e.id === `${ext.namespace}.${ext.name}`
        );

        return `
          <div class="extension-item" data-namespace="${ext.namespace}" data-name="${ext.name}">
            ${ext.files?.icon ? `
              <img src="${ext.files.icon}" class="ext-icon-img" alt="${ext.displayName}">
            ` : `
              <div class="ext-icon" style="background: ${getRandomColor()}; color: #fff;">
                ${(ext.displayName || ext.name).charAt(0).toUpperCase()}
              </div>
            `}
            <div class="ext-info">
              <div class="ext-name">${ext.displayName || ext.name}</div>
              <div class="ext-desc">${(ext.description || '').substring(0, 60)}${ext.description?.length > 60 ? '...' : ''}</div>
              <div class="ext-meta">
                <span>by ${ext.namespace}</span>
                <span>⬇️ ${formatNumber(ext.downloadCount || 0)}</span>
              </div>
            </div>
            ${isInstalled ? 
              '<div class="ext-badge installed">✓ Installed</div>' :
              '<button class="ext-install-btn">Install</button>'
            }
          </div>
        `;
      }).join('')}
    `;

    // Clear search button
    document.getElementById('btn-clear-search')?.addEventListener('click', () => {
      searchInput.value = '';
      searchResults = [];
      renderExtensions();
    });

    // Add click handlers
    extensionsList.querySelectorAll('.extension-item').forEach(item => {
      item.addEventListener('click', async () => {
        const namespace = item.dataset.namespace;
        const name = item.dataset.name;
        const ext = results.find(e => e.namespace === namespace && e.name === name);
        if (ext) await showExtensionDetails(ext);
      });
    });

    extensionsList.querySelectorAll('.ext-install-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const item = btn.closest('.extension-item');
        const namespace = item.dataset.namespace;
        const name = item.dataset.name;
        const ext = results.find(e => e.namespace === namespace && e.name === name);
        if (ext) await installExtension(ext);
      });
    });
  }

  function showLoading() {
    if (extensionsList) {
      extensionsList.innerHTML = '<div class="ext-loading">Searching extensions...</div>';
    }
  }

  function showError(message) {
    if (extensionsList) {
      extensionsList.innerHTML = `<div class="ext-error">${message}</div>`;
    }
  }

  // ─── Storage ──────────────────────────────────────────────────────────────

  function loadInstalledExtensions() {
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        installedExtensions = JSON.parse(stored);
      }
    } catch (error) {
      console.error('[ExtensionsManager] Failed to load extensions:', error);
    }
  }

  function saveInstalledExtensions() {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(installedExtensions));
    } catch (error) {
      console.error('[ExtensionsManager] Failed to save extensions:', error);
    }
  }

  // ─── Utilities ────────────────────────────────────────────────────────────

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }

  function getRandomColor() {
    const colors = ['#7c6af7', '#89b4fa', '#a6e3a1', '#fab387', '#f38ba8', '#cba6f7', '#89dceb'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  return {
    init,
    searchExtensions,
    installExtension,
    uninstallExtension,
    getInstalled: () => installedExtensions,
  };
})();

// Expose to window
window.ExtensionsManager = ExtensionsManager;
