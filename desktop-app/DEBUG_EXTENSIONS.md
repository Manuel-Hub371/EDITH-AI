# Debug Extensions Panel Issue

## Steps to Debug

1. **Open Developer Tools**: Press `Ctrl+Shift+I` or `F12`

2. **Check Console for Errors**: Look for any red errors

3. **Test in Console**: Run these commands one by one:

```javascript
// Check if ExtensionsManager exists
window.ExtensionsManager

// Check if extensions list element exists
document.getElementById('extensions-list')

// Check if panel exists
document.getElementById('panel-extensions')

// Check if panel has active class
document.getElementById('panel-extensions').classList.contains('active')

// Manually add active class to test
document.getElementById('panel-extensions').classList.add('active')

// Check activity button
document.querySelector('[data-panel="extensions"]')

// Check if button has click listener
document.querySelector('[data-panel="extensions"]').onclick
```

4. **Check Network Tab**: 
   - Go to Network tab
   - Reload page (Ctrl+R)
   - Look for `extensions.js` in the list
   - Check if it loaded successfully (Status 200)

5. **Common Issues**:
   - ExtensionsManager is undefined → Script not loaded
   - Panel exists but not visible → CSS issue
   - No errors but not working → Initialization order issue

---

Run these and report what you see!
