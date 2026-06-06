# ✅ EDITH IDE - Complete Testing Checklist

**Use this checklist to verify all features are working correctly**

---

## 🚀 Startup Tests

- [ ] Run `npm start` successfully
- [ ] Application window opens
- [ ] Splash screen appears
- [ ] Backend connection established
- [ ] Main IDE interface loads
- [ ] No critical errors in console (F12)

---

## 🎨 Monaco Editor Tests

- [ ] Welcome screen displays
- [ ] Click "Open Folder" works
- [ ] File tree displays files
- [ ] Double-click file opens it
- [ ] **Text appears in editor** ✨
- [ ] Syntax highlighting works
- [ ] Line numbers visible
- [ ] Minimap displays on right
- [ ] Cursor blinks and moves
- [ ] Can type and edit text
- [ ] Ctrl+S saves file
- [ ] Ctrl+F opens find dialog
- [ ] IntelliSense suggestions appear
- [ ] Code folding works

---

## 📁 File Management Tests

- [ ] Create new file (Ctrl+N)
- [ ] Create new folder
- [ ] Rename file/folder
- [ ] Delete file/folder
- [ ] Open multiple files in tabs
- [ ] Switch between tabs
- [ ] Close tabs (middle-click or X)
- [ ] Tabs show dirty indicator (•)
- [ ] File tree refreshes on changes

---

## 💻 Terminal Tests

- [ ] Toggle terminal (Ctrl+`)
- [ ] Terminal shows prompt
- [ ] Can type commands
- [ ] Commands execute
- [ ] Output displays
- [ ] Multiple terminal tabs work
- [ ] Split terminal works
- [ ] Clear terminal works
- [ ] Terminal resizes

---

## 🤖 AI Panel Tests (NEW!)

### Visual Tests
- [ ] AI panel appears on right side
- [ ] Panel has proper styling
- [ ] Toggle button in title bar (🤖)
- [ ] Status shows "Connected to EDITH" or "Backend offline"
- [ ] Welcome screen displays
- [ ] 4 suggestion buttons visible
- [ ] Input area at bottom
- [ ] Send button visible

### Interaction Tests
- [ ] Toggle button shows/hides panel
- [ ] Ctrl+Shift+A keyboard shortcut works
- [ ] Can resize panel by dragging left edge
- [ ] Panel width: 300px - 600px
- [ ] Input accepts text
- [ ] Input auto-resizes (up to 120px)
- [ ] Enter sends message
- [ ] Shift+Enter creates new line
- [ ] Suggestion buttons populate input
- [ ] Clear button resets conversation
- [ ] Close button hides panel

### Backend Tests (Requires Backend Running)
- [ ] Status shows "Connected to EDITH" (green)
- [ ] Typing message and pressing Enter
- [ ] Thinking indicator appears (3 bouncing dots)
- [ ] AI response displays
- [ ] Response has correct formatting
- [ ] Code blocks are formatted
- [ ] Inline code is highlighted
- [ ] Copy button copies to clipboard
- [ ] Insert button adds code to editor
- [ ] Conversation history maintained

### Context Tests
- [ ] Open a file in editor
- [ ] Send message to AI
- [ ] Check DevTools Network tab (F12)
- [ ] Verify context includes file path
- [ ] Verify context includes file content
- [ ] Select text in editor
- [ ] Send message to AI
- [ ] Verify context includes selection
- [ ] Verify workspace path is included

---

## 🔍 Search Tests

- [ ] Ctrl+Shift+F opens search panel
- [ ] Can search across workspace
- [ ] Results display correctly
- [ ] Click result opens file
- [ ] Replace works
- [ ] Regex search works
- [ ] Case-sensitive option works

---

## 🌿 Git Panel Tests

- [ ] Git panel displays (if git repo)
- [ ] Shows changed files
- [ ] Can stage changes
- [ ] Can write commit message
- [ ] Commit button works
- [ ] Branch indicator in status bar

---

## ⚙️ Settings Tests

- [ ] Settings panel opens
- [ ] Can change font size
- [ ] Can change tab size
- [ ] Can toggle word wrap
- [ ] Can toggle minimap
- [ ] Can change line numbers style
- [ ] Can change theme
- [ ] Apply button saves settings
- [ ] Settings persist after restart

---

## ⌨️ Keyboard Shortcuts Tests

- [ ] `Ctrl+N` - New File
- [ ] `Ctrl+O` - Open File
- [ ] `Ctrl+S` - Save File
- [ ] `Ctrl+Shift+S` - Save As
- [ ] `Ctrl+W` - Close Tab
- [ ] `Ctrl+P` - Command Palette
- [ ] `Ctrl+F` - Find
- [ ] `Ctrl+H` - Replace
- [ ] `Ctrl+B` - Toggle Sidebar
- [ ] `Ctrl+\`` - Toggle Terminal
- [ ] `Ctrl+Shift+A` - Toggle AI Panel ✨
- [ ] `F5` - Run File
- [ ] `F12` - Dev Tools
- [ ] `Ctrl++` - Zoom In
- [ ] `Ctrl+-` - Zoom Out
- [ ] `Ctrl+0` - Reset Zoom

---

## 🎨 Theme Tests

- [ ] Switch to Nova Dark theme
- [ ] Switch to Nova Light theme
- [ ] Switch to Nova Midnight theme
- [ ] Colors apply correctly
- [ ] Editor theme syncs
- [ ] UI theme syncs

---

## 🪟 Window Tests

- [ ] Minimize button works
- [ ] Maximize/Restore button works
- [ ] Close button works
- [ ] Window can be dragged by title bar
- [ ] Window resizes correctly
- [ ] Maximize state persists

---

## 🔧 Integration Tests

- [ ] Sidebar and editor don't overlap
- [ ] AI panel and editor don't overlap
- [ ] Terminal and editor don't overlap
- [ ] Resizing sidebar updates editor
- [ ] Resizing AI panel updates editor
- [ ] Resizing terminal updates editor
- [ ] All panels work together
- [ ] No layout glitches
- [ ] Smooth animations

---

## 📊 Performance Tests

- [ ] Application starts in < 5 seconds
- [ ] Monaco loads in < 2 seconds
- [ ] AI panel responds quickly
- [ ] File tree loads fast
- [ ] Tabs switch instantly
- [ ] No lag when typing
- [ ] Smooth scrolling
- [ ] No memory leaks (check Task Manager)

---

## 🐛 Error Handling Tests

- [ ] Opening non-existent file shows error
- [ ] Invalid save path shows error
- [ ] Backend offline shows error in AI panel
- [ ] Network error handled gracefully
- [ ] Invalid JSON response handled
- [ ] File permission error handled
- [ ] All errors have user-friendly messages

---

## 📱 Context Menu Tests

- [ ] Right-click in file tree shows menu
- [ ] Right-click in editor shows menu
- [ ] Right-click on tab shows menu
- [ ] Menu items work correctly
- [ ] Menu closes on click away

---

## 🎯 Edge Cases

- [ ] Open very large file (>1MB)
- [ ] Open file with special characters
- [ ] Open binary file
- [ ] Work with deeply nested folders
- [ ] Handle long file names
- [ ] Handle many open tabs (10+)
- [ ] Handle rapid tab switching
- [ ] Handle fast typing
- [ ] Handle network interruption

---

## 🔐 Security Tests

- [ ] No console errors about CSP
- [ ] No mixed content warnings
- [ ] File paths are sanitized
- [ ] XSS protection in AI responses
- [ ] No sensitive data in logs

---

## 📚 Documentation Tests

- [ ] README.md is accurate
- [ ] Quick start guide works
- [ ] API documentation is complete
- [ ] Code examples work
- [ ] Screenshots match current UI
- [ ] All links are valid

---

## ✨ AI Panel Specific Tests

### Message Formatting
- [ ] Plain text displays correctly
- [ ] Code blocks have syntax highlighting
- [ ] Inline code is styled differently
- [ ] Line breaks are preserved
- [ ] Long messages scroll correctly
- [ ] URLs are not clickable (security)

### User Experience
- [ ] Messages scroll to bottom automatically
- [ ] Thinking animation is smooth
- [ ] Avatar icons display correctly
- [ ] Timestamps are readable
- [ ] Action buttons are accessible
- [ ] Panel remembers width after toggle

### Backend Communication
- [ ] Request includes correct headers
- [ ] Request body is valid JSON
- [ ] Context is properly formatted
- [ ] Conversation history is sent
- [ ] Error responses are handled
- [ ] Timeout is handled (if backend slow)

---

## 🎉 Final Checks

- [ ] All features from this checklist work
- [ ] No critical bugs found
- [ ] Performance is acceptable
- [ ] UI looks professional
- [ ] Documentation is complete
- [ ] Ready for user testing
- [ ] Ready for production use

---

## 📝 Notes Section

**Issues Found:**
- 

**Performance Observations:**
- 

**User Feedback:**
- 

**Improvements Needed:**
- 

---

## ✅ Sign-Off

- [ ] Frontend testing complete
- [ ] Backend integration tested (if available)
- [ ] Documentation reviewed
- [ ] Ready for deployment

**Tested By**: _______________  
**Date**: _______________  
**Version**: 1.0.0  
**Status**: ☐ Pass ☐ Fail ☐ Needs Work

---

**Next Steps After Testing:**
1. Implement backend `/api/chat` endpoint
2. Test actual AI responses
3. Gather user feedback
4. Plan future enhancements
5. Deploy to production

**Good luck with testing! 🚀**
