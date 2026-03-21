const memoryStore = require('./memoryStore');
const powershellExecutor = require('./powershellExecutor');

/**
 * AppResolver (V42.0 Self-Learning Launcher)
 * Manages the intelligent resolution of application names into executable paths.
 */
class AppResolver {
    constructor() {
        // Security Configuration (V45.2)
        const security = require('./security.json');
        this.blocklist = security.blocklist;

        // Predefined aliases for common apps (including UWP protocols V46.0)
        this.aliases = {
            "chrome": "chrome",
            "google chrome": "chrome",
            "vscode": "code",
            "vs code": "code",
            "visual studio code": "code",
            "settings": "ms-settings:",
            "store": "ms-windows-store:",
            "microsoft store": "ms-windows-store:",
            "calculator": "calculator:",
            "calc": "calculator:",
            "notepad": "notepad",
            "cmd": "cmd",
            "powershell": "powershell",
            "explorer": "explorer"
        };
    }

    /**
     * Resolve an app name to a path
     */
    async resolve(appName) {
        // 1. Direct Path & Sibling Resolution (V44.1)
        const fs = require('fs');
        const path = require('path');
        
        if (fs.existsSync(appName)) {
            const ext = path.extname(appName).toLowerCase();
            
            // If it's a script, try to find a sibling .exe
            if (ext === '.cmd' || ext === '.bat') {
                const name = path.basename(appName, ext);
                const parent = path.dirname(appName);
                const sibling = path.join(parent, `${name}.exe`);
                
                if (fs.existsSync(sibling)) {
                    console.log(`[AppResolver] SMART: Resolved script ${appName} to sibling ${sibling}`);
                    return sibling;
                }
                
                // Try parent folder (e.g. bin/code.cmd -> Code.exe)
                const grandparent = path.dirname(parent);
                const files = fs.readdirSync(grandparent);
                const parentSibling = files.find(f => f.toLowerCase().endsWith('.exe') && !f.toLowerCase().includes('unins'));
                
                if (parentSibling) {
                    const fullParentSibling = path.join(grandparent, parentSibling);
                    console.log(`[AppResolver] SMART: Resolved script ${appName} to parent sibling ${fullParentSibling}`);
                    return fullParentSibling;
                }
            }
            
            // Check Blocklist for direct paths
            if (this.blocklist.includes(ext)) {
                throw new Error(`SECURITY_REJECTION: Extension "${ext}" is blocked for safety.`);
            }
            return appName;
        }

        // 2. Normalize & Protocol Check (V46.1)
        const keyword = this._normalize(appName);

        if (keyword.endsWith(':')) {
            console.log(`[AppResolver] PROTOCOL: Resolved ${appName} to URI ${keyword}`);
            return keyword;
        }
        
        // 2. Fast Path: Memory
        let entry = memoryStore.get(keyword);
        if (entry) {
            console.log(`[AppResolver] INSTANT: Found ${keyword} in memory.`);
            return entry;
        }

        // 3. Fallback: Dynamic Discovery
        console.log(`[AppResolver] DISCOVERY: Searching for ${keyword}...`);
        const discoveredPath = await powershellExecutor.discover(keyword);

        if (discoveredPath) {
            console.log(`[AppResolver] LEARNED: ${keyword} found at ${discoveredPath}`);
            memoryStore.set(keyword, discoveredPath);
            return discoveredPath;
        }

        // 4. Final Fallback: Check if app name itself is a path or command
        return appName; 
    }

    /**
     * Internal: Normalize user input into a searchable keyword
     */
    _normalize(input) {
        const clean = input.toLowerCase().trim();
        
        // Use Alias if exists
        if (this.aliases[clean]) return this.aliases[clean];
        
        // Remove common prefixes
        return clean
            .replace(/^(open|launch|start|run|go to|show me)\s+/, '')
            .replace(/\.exe$/, '')
            .split(' ')[0]; // Take the first meaningful word
    }
}

module.exports = new AppResolver();
