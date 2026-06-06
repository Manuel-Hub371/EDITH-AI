# 🎯 Extensions Marketplace - Quick Start Guide

**EDITH IDE with Open VSX Integration**

---

## 🚀 Getting Started (30 Seconds)

### Open Extensions Panel
- Click the **📦 Extensions** icon in the activity bar (left side)
- OR press **`Ctrl+Shift+X`**

### Search for Extensions
1. Type in the search box: `python`, `theme`, `javascript`, etc.
2. Wait ~500ms for results to load
3. Browse results from **Open VSX Registry**

### Install an Extension
**Method 1 - Quick Install:**
- Click **Install** button on any extension card

**Method 2 - View Details First:**
- Click the extension card to open details modal
- Review full description, ratings, downloads
- Click **Install** button in modal

### Uninstall an Extension
1. Find extension in **Installed** section
2. Click **Uninstall** button
3. Confirm in dialog

---

## 📦 What You Can Do Right Now

### ✅ Working Features
- **Search** thousands of extensions from Open VSX
- **Browse** recommended extensions by category
- **View** detailed extension information
- **Install** extensions (saves to your profile)
- **Uninstall** extensions
- **Persist** your installed extensions (saved locally)

### ⚠️ Current Limitations
- Extensions are **not actually executed** (UI only)
- No language features added to editor
- No themes applied to IDE
- This is a **marketplace demonstration**

---

## 🎨 Interface Overview

```
┌─────────────────────────────────────┐
│ EXTENSIONS                          │
├─────────────────────────────────────┤
│ [Search Open VSX Registry...     ] │
├─────────────────────────────────────┤
│ Installed (2)                       │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ [🐍] Python Extension           │ │
│ │      by Microsoft               │ │
│ │      [Uninstall]                │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Recommended                     [↻] │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ [JS] JavaScript Support         │ │
│ │      by VSCode Community        │ │
│ │      ⬇️ 1.2M    [Install]       │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## 🔍 Search Tips

### Popular Search Queries
- `python` - Python development tools
- `javascript` - JS/TS support and tools
- `theme` - Color themes for the editor
- `prettier` - Code formatters
- `eslint` - Linters and code quality
- `git` - Git integration tools
- `markdown` - Markdown preview and editing

### Search Features
- **Debounced**: Waits 500ms after you stop typing
- **Real-time**: Searches Open VSX Registry live
- **Limited**: Returns top 20 results
- **Clear**: Click × to clear search and return to default view

---

## 📊 Extension Information

Each extension card shows:
- **Icon**: Official icon or generated avatar
- **Name**: Display name of extension
- **Description**: Brief description (auto-truncated)
- **Author**: Publisher/namespace
- **Downloads**: Formatted download count (1.2M, 500K, etc.)
- **Status**: "✓ Installed" badge or "Install" button

---

## 🎯 Use Cases

### For Python Development
1. Search for "python"
2. Install Python extension
3. Install Pylint for linting
4. Install Python Test Explorer

### For Web Development
1. Search for "javascript"
2. Install ESLint
3. Install Prettier formatter
4. Install Live Server

### For Theme Customization
1. Search for "theme"
2. Browse available themes
3. Install your favorite color theme
4. (Currently themes won't apply - UI demo only)

---

## 🔄 Workflow Example

**Installing Multiple Extensions:**

```
1. Press Ctrl+Shift+X
2. Search "python"
3. Install Python extension
4. Search "eslint"  
5. Install ESLint extension
6. Search "prettier"
7. Install Prettier extension
8. All installed extensions appear in "Installed" section
```

**Managing Extensions:**

```
1. Open Extensions panel
2. View "Installed" section
3. Click "Uninstall" on any extension you want to remove
4. Confirm removal
5. Extension removed from your profile
```

---

## 🌐 About Open VSX

### What is Open VSX?
Open VSX Registry is an **open-source alternative** to the Visual Studio Marketplace. It hosts thousands of VS Code extensions.

### Website
https://open-vsx.org

### API Endpoint (used by EDITH)
https://open-vsx.org/api

### Categories Available
- Programming Languages
- Themes
- Linters
- Formatters
- Snippets
- Debuggers
- SCM Providers
- And more...

---

## ⚡ Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Open Extensions | `Ctrl+Shift+X` |
| Focus Search | Click search box |
| Clear Search | Click × button |
| Close Modal | `Esc` or click outside |

---

## 🐛 Troubleshooting

### Extensions Not Loading
**Check:**
1. Is EDITH connected to the internet?
2. Open browser to https://open-vsx.org (is it accessible?)
3. Check Developer Console (`Ctrl+Shift+I`) for errors
4. Try refreshing recommended extensions (click ↻ button)

### Search Returns Nothing
**Try:**
1. Check your internet connection
2. Wait a moment and try again
3. Try a different search term
4. Check if Open VSX API is up: https://open-vsx.org/api/-/search?query=python

### Extensions Don't Persist
**Check:**
1. Is localStorage enabled in your browser?
2. Try clearing browser cache and reinstalling
3. Check Developer Console for localStorage errors

### Extension "Installed" But Not Working
**This is expected!** Currently, extensions are installed to localStorage only. They don't actually execute or add functionality. This is a UI demonstration of the marketplace.

**To make extensions functional**, we need to implement:
- VSIX file download
- Extension extraction
- Monaco Editor integration
- Extension host execution environment

---

## 📈 Statistics

### Current Integration
- **Extensions Available**: Thousands (entire Open VSX Registry)
- **Search Capability**: Full-text search across all extensions
- **Categories**: All Open VSX categories
- **Installation**: Simulated (localStorage)
- **Persistence**: Yes (saved locally)

### API Limits
- **Search Results**: 20 per query
- **Featured Extensions**: 10 total (top from each category)
- **Rate Limiting**: Follows Open VSX API limits

---

## 🎨 Customization

### Change Featured Categories
Edit `renderer/js/extensions.js` line ~65:
```javascript
const categories = [
  'Programming Languages',
  'Themes',
  'Linters',
  'Formatters'
];
// Add or remove categories as desired
```

### Change Search Debounce
Edit `renderer/js/extensions.js` line ~32:
```javascript
searchInput.addEventListener('input', debounce(handleSearch, 500));
// Change 500 to desired milliseconds
```

### Change Results Per Page
Edit `renderer/js/extensions.js` line ~49:
```javascript
async function searchExtensions(query, size = 20) {
// Change 20 to desired number
```

---

## 🔮 Future Features

### Coming Soon
- [ ] Actual VSIX download and installation
- [ ] Extension activation and execution
- [ ] Monaco Editor language registration
- [ ] Theme application
- [ ] Extension settings/configuration
- [ ] Automatic extension updates
- [ ] Extension recommendations based on workspace
- [ ] Extension dependency management

### Requested Features
- Multi-select install/uninstall
- Extension ratings and reviews
- Extension changelogs
- Workspace extension sync
- Extension marketplace analytics

---

## 📚 Related Documentation

- **Open VSX Guide**: `OPEN_VSX_GUIDE.md` (500+ lines, comprehensive)
- **Open VSX Complete**: `OPEN_VSX_COMPLETE.md` (implementation summary)
- **Test Checklist**: `OPEN_VSX_TEST.md` (testing guide)
- **Main README**: `README.md` (user guide)

---

## 💡 Tips & Tricks

### Finding Quality Extensions
1. Sort by **download count** (shown on cards)
2. Look for **official publishers** (Microsoft, etc.)
3. Check **descriptions** for what you need
4. View **full details** before installing

### Organizing Extensions
1. Only install what you need
2. Uninstall unused extensions
3. Extensions persist, so you can always reinstall

### Performance
- Search is debounced (500ms) - don't spam searches
- Featured extensions load once on panel open
- Click refresh (↻) only when needed

---

## ✅ Quick Checklist

Ready to use Extensions? Check these:

- [ ] Can open Extensions panel (`Ctrl+Shift+X`)
- [ ] Search box is visible
- [ ] Can search for "python"
- [ ] Results load from Open VSX
- [ ] Can view extension details
- [ ] Can install an extension
- [ ] Extension appears in Installed section
- [ ] Can uninstall an extension
- [ ] Featured extensions load

---

## 🎉 You're Ready!

The Extensions marketplace is fully integrated and ready to use. Start by:

1. **Opening Extensions panel** (`Ctrl+Shift+X`)
2. **Searching** for extensions you need
3. **Installing** your favorites
4. **Exploring** the Open VSX Registry

**Have fun exploring thousands of extensions!** 🚀

---

**Questions or Issues?**
Check `OPEN_VSX_GUIDE.md` for detailed documentation or `OPEN_VSX_TEST.md` for testing procedures.
