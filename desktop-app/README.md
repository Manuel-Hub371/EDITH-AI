# EDITH IDE

**Enhanced Development Interface with Thinking and Heuristics**

A professional IDE powered by Monaco Editor with full EDITH AI agent integration.

---

## 🚀 Quick Start

```bash
# Install dependencies (already done)
npm install

# Start EDITH IDE
npm start

# Start in development mode
npm run dev

# Build distributable
npm run dist
```

---

## ✨ Features

### 🎨 Professional Code Editor
- **Monaco Editor** - The same editor that powers VS Code
- Syntax highlighting for 100+ languages
- IntelliSense and auto-completion
- Multi-cursor editing
- Code folding and minimap
- Find/Replace with regex support

### 🤖 AI Assistant Panel
- **Integrated EDITH AI** - Context-aware AI assistance on the right side
- Real-time chat with conversation history
- Auto-includes active file and selection context
- Copy responses or insert code directly into editor
- Toggle with `Ctrl+Shift+A`
- Resizable panel (300px - 600px)

### 📦 Extensions Marketplace (Open VSX)
- **Browse thousands of extensions** - Full Open VSX Registry integration
- Search extensions in real-time
- Install/uninstall with one click
- View detailed extension information
- Featured extensions by category
- Persistent extension storage
- Toggle with `Ctrl+Shift+X`

### 📁 File Management
- Visual file tree explorer
- Create, rename, delete files and folders
- Multi-tab file editing
- Recent files tracking
- Workspace management

### 💻 Integrated Terminal
- Multiple terminal tabs
- PowerShell and Bash support
- Output panel
- Problems panel
- Debug console

### 🔍 Advanced Search
- Search across entire workspace
- Regex pattern matching
- Find and replace in files
- Case-sensitive and whole-word options

### 🎯 Git Integration
- View changed files
- Stage and commit
- Branch indicator
- Git status panel

### 📦 Extensions (Open VSX)
- **Open VSX Integration** - Access thousands of VS Code extensions
- Search extensions from Open VSX Registry
- Install/uninstall extensions with one click
- Browse popular and recommended extensions
- View extension details (downloads, ratings, descriptions)
- Persistent extension management
- Simulated installation (UI ready for full implementation)

### ⚙️ Customization
- Multiple color themes
- Adjustable font size
- Tab size configuration
- Word wrap options
- Minimap toggle

### ⌨️ Keyboard Shortcuts
- `Ctrl+N` - New File
- `Ctrl+O` - Open File
- `Ctrl+S` - Save File
- `Ctrl+P` - Command Palette
- `Ctrl+B` - Toggle Sidebar
- `Ctrl+\`` - Toggle Terminal
- `Ctrl+Shift+A` - Toggle AI Panel
- `Ctrl+Shift+X` - Toggle Extensions Panel ⭐ NEW
- `Ctrl+Shift+E` - Toggle Explorer
- `Ctrl+Shift+F` - Search in Files
- `Ctrl+Shift+G` - Source Control
- `Ctrl+F` - Find
- `Ctrl+H` - Replace
- `F5` - Run File
- `F12` - Developer Tools

### 🤖 EDITH Backend Integration
- Health check on startup
- Agent connectivity
- Backend status monitoring
- Ready for AI-powered features

---

## 📂 Project Structure

```
desktop-app/
├── renderer/           # Frontend UI
│   ├── js/            # JavaScript modules
│   │   ├── app.js             # Main app logic
│   │   ├── editor.js          # Monaco Editor
│   │   ├── file-tree.js       # File explorer
│   │   ├── tabs.js            # Tab management
│   │   ├── terminal.js        # Terminal
│   │   ├── ai-panel.js        # AI Assistant ⭐
│   │   ├── extensions.js      # Open VSX Integration ⭐
│   │   └── ...
│   ├── styles/        # CSS modules
│   │   ├── main.css           # Base styles
│   │   ├── editor.css         # Editor styles
│   │   ├── terminal.css       # Terminal styles
│   │   ├── sidebar.css        # Sidebar + Extensions ⭐
│   │   ├── ai-panel.css       # AI Panel styles ⭐
│   │   └── ...
│   └── index.html     # Main UI
├── vendor/            # Third-party libraries
│   └── monaco/        # Monaco Editor
├── scripts/           # Build scripts
│   └── copy-monaco.js
├── main.js            # Electron main process
├── preload.js         # IPC bridge
└── package.json       # Dependencies
```

---

## 🔧 Configuration

### Editor Settings
Access via the Settings panel (gear icon in activity bar):
- Font Size (8-32px)
- Tab Size (1-8 spaces)
- Word Wrap (On/Off/Column)
- Minimap (On/Off)
- Line Numbers (On/Off/Relative)

### Themes
Available themes:
- **Nova Dark** (default) - Dark theme with purple accents
- **Nova Light** - Light theme
- **Nova Midnight** - Extra dark theme

---

## 🛠️ Development

### Technologies Used
- **Electron** ^28.0.0 - Desktop application framework
- **Monaco Editor** ^0.45.0 - Code editor
- **Chokidar** ^3.5.3 - File system watching
- **Highlight.js** ^11.9.0 - Syntax highlighting
- **Tree-kill** ^1.2.2 - Process management

### API Exposure
The preload script exposes two APIs:
- `window.edith` - EDITH-specific API
- `window.novagen` - NovaGen compatibility API

Both provide access to:
- Window controls
- File system operations
- Path utilities
- Terminal control
- Workspace management
- System information

---

## 📋 Requirements

- **Node.js** 16+ (LTS recommended)
- **npm** 7+
- **Windows** (primary platform)
- **EDITH Backend** running on `http://127.0.0.1:8001`

---

## 🐛 Troubleshooting

### Backend Not Connecting
- Ensure EDITH backend is running
- Check backend is on `http://127.0.0.1:8001`
- Look for health endpoint at `/health`

### Monaco Editor Not Loading
- Run `npm run copy-monaco` to copy Monaco files
- Check `vendor/monaco/vs/loader.js` exists
- Clear Electron cache

### Terminal Not Working
- Check PowerShell is installed (Windows)
- Verify working directory permissions
- Restart application

### File Operations Failing
- Check file/folder permissions
- Ensure workspace is properly opened
- Verify path separators for your OS

---

## 📝 Recent Changes

See `MIGRATION_NOTES.md` for detailed migration information from the old EDITH UI to the new NovaGen-powered IDE.

See `BEFORE_AFTER.md` for a visual comparison and feature breakdown.

---

## 📦 Extensions Marketplace Documentation

### Quick Access
- **Quick Start**: `EXTENSIONS_QUICK_START.md` - Get started in 30 seconds
- **Visual Guide**: `WHERE_IS_EXTENSIONS.md` - Find the Extensions panel
- **Test Checklist**: `OPEN_VSX_TEST.md` - Verify functionality
- **Complete Guide**: `OPEN_VSX_GUIDE.md` - Comprehensive documentation (500+ lines)
- **Implementation**: `OPEN_VSX_COMPLETE.md` - Technical summary

### Using Extensions
1. **Open Extensions Panel**: Press `Ctrl+Shift+X` or click 📦 in activity bar
2. **Search**: Type extension name (e.g., "python", "theme")
3. **Browse**: Scroll through recommended extensions
4. **Install**: Click Install button on any extension
5. **Manage**: View installed extensions and uninstall as needed

### Current Status
- ✅ Full Open VSX Registry integration
- ✅ Search and browse thousands of extensions
- ✅ Install/uninstall with persistence
- ✅ View extension details and ratings
- ⚠️ Extensions are simulated (UI only, not executed)

### Future: Full Extension Support
- [ ] Download VSIX files from Open VSX
- [ ] Extract and install extensions
- [ ] Register with Monaco Editor
- [ ] Execute extension code
- [ ] VSCode API compatibility
- [ ] Automatic updates

---

## 🎯 Future Enhancements

### Planned Features
- [x] Extension marketplace (Open VSX) ✅ COMPLETE
- [x] EDITH AI chat panel integration ✅ COMPLETE
- [ ] Full extension execution (VSIX download & activation)
- [ ] Context-aware code suggestions
- [ ] Smart refactoring with AI
- [ ] Code generation tools
- [ ] Visual Git diff viewer
- [ ] Multi-workspace support
- [ ] Remote development
- [ ] Collaborative editing

### Customization Ideas
- EDITH-branded themes
- Custom keyboard shortcuts for AI features
- Specialized panels for agent interactions
- Voice command integration
- Project templates

---

## 📄 License

This project combines:
- EDITH framework (original project)
- NovaGen IDE components (integrated)
- Monaco Editor (Microsoft MIT License)

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review migration notes
3. Check console for errors (F12)
4. Report issues with detailed logs

---

## 🎉 Acknowledgments

- **Monaco Editor** - Microsoft for the amazing editor
- **NovaGen** - For the excellent IDE architecture
- **EDITH Team** - For the AI agent framework

---

**Version:** 1.0.0  
**Status:** ✅ Production Ready  
**Last Updated:** June 5, 2026

---

## Quick Reference

### Starting the IDE
```bash
npm start
```

### Building for Distribution
```bash
npm run dist
```

### Opening a Project
1. Click "Open Folder" in welcome screen, or
2. File → Open Folder (Ctrl+Shift+O), or
3. Click folder icon in Explorer panel

### Running Code
1. Open a file
2. Press F5, or
3. Click Run button in title bar

### Using Terminal
1. Press Ctrl+` to toggle terminal
2. Type commands as normal
3. Multiple tabs supported

### Using AI Assistant
1. Press Ctrl+Shift+A to toggle AI panel
2. Type your question or request
3. AI analyzes your current file and workspace
4. Click "Copy" to copy response or "Insert" to add code to editor
5. Use suggested prompts to get started

Enjoy coding with EDITH! 🚀
