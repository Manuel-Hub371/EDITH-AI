const searchService = require('../../services/search');
const learningService = require('../../services/learning');
const aliasService = require('../../services/alias');
const fs = require('fs');
const os = require('os');
const path = require('path');


/**
 * Resolver Pipeline (V53.3)
 * 
 * Centralized logic for converting user-intent targets into validated system paths.
 * Order: App Normalization -> Alias (Phase 2) -> Index Search (Phase 1) -> Confidence Ranking.
 */
class Resolver {
    constructor() {
        this.appAliases = {
            "chrome": "chrome", "google chrome": "chrome", "vscode": "code", "vs code": "code",
            "visual studio code": "code", "code": "code", "notepad": "notepad", "cmd": "cmd",
            "powershell": "powershell", "explorer": "explorer", "browser": "chrome",
            "settings": "ms-settings:", "calculator": "calc", "calc": "calc"
        };
    }

    _healPath(target) {
        if (!target) return target;
        
        const home = os.homedir();
        const username = os.userInfo().username;

        // 1. Replace AI placeholders with exact OS user
        target = target.replace(/<current_user>|\{current_user\}|<username>|\{username\}/gi, username);
        
        // Handle explicit AI directory structures like C:\Users\<current_user>
        target = target.replace(/c:[\\\/]+users[\\\/]+[a-z0-9_.-]+/ig, (match) => {
            if (match.toLowerCase().includes(username.toLowerCase())) {
                return home;
            }
            return match;
        });
        
        const cleanTarget = target.toLowerCase().trim().replace(/\\/g, '/'); // Normalize slashes for matching
        const parts = cleanTarget.split('/');
        
        const baseFolders = ['desktop', 'documents', 'downloads', 'music', 'pictures', 'videos'];
        
        // Check if the target is a base folder or starts with one
        if (baseFolders.includes(parts[0])) {
            const folderName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
            const baseFolderPath = path.join(home, folderName);
            
            if (parts.length === 1) {
                return baseFolderPath;
            } else {
                // Join the base folder path with the rest of the subpath
                return path.join(baseFolderPath, target.substring(parts[0].length).replace(/^[\\\/]+/, ''));
            }
        }

        // 2. Direct home directory normalization
        if (target.startsWith('~\\') || target.startsWith('~/')) {
            return path.join(home, target.substring(2));
        }

        return target;
    }


    _normalizeAppTarget(target) {
        let clean = target.toLowerCase().trim()
            .replace(/^(open|launch|start|run|go to|show me)\s+/, '')
            .replace(/\.exe$/, '');
        
        if (this.appAliases[clean]) return this.appAliases[clean];
        const coreName = clean.split(' ')[0];
        if (this.appAliases[coreName]) return this.appAliases[coreName];
        return coreName;
    }

    async resolve(target, intent) {
        if (!target) return { path: null, needsConfirmation: false };

        let query = this._healPath(target);

        // 0. App Normalization Gate
        if (intent && (intent.includes('APPLICATION') || intent.includes('WINDOW'))) {
            query = this._normalizeAppTarget(target);
            // If it resolves to a pure system shell command (e.g. 'chrome', 'calc', 'ms-settings:')
            // return it immediately as a verified path.
            if (Object.values(this.appAliases).includes(query)) {
                return { bestMatch: { path: query, name: query, type: 'app' }, needsConfirmation: false };
            }
        }

        // 1. Pre-empt with Phase 2 (Memory/Alias) Check
        // V53.1: Moved above absolute path check to handle stale AI context paths
        const aliasEntry = await aliasService.resolve(query);
        if (aliasEntry) {
            console.log(`[Resolver] Phase 2 Alias Match Hit: "${query}" -> ${aliasEntry.targetPath}`);
            return {
                bestMatch: {
                    path: aliasEntry.targetPath,
                    name: aliasEntry.alias,
                    type: aliasEntry.type,
                    source: 'alias',
                    confidence: 1.0
                },
                needsConfirmation: false
            };
        }

        // 2. Check for Absolute Paths (Bypass search)
        if (query.includes(':') || query.includes('\\')) {
            return {
                bestMatch: { path: query, name: query, type: 'file' },
                needsConfirmation: false
            };
        }

        // 3. Query Phase 1 Index & Calculate Confidence
        console.log(`[Resolver] Phase 1 Index Search: "${query}" for intent: ${intent}`);
        const rawResults = await searchService.find(query, { limit: 10 });
        const resolved = await learningService.rankAndScore(query, rawResults);

        if (!resolved) {
            // OS-level fallback for unregistered executable names
            if (intent && (intent.includes('APPLICATION') || intent.includes('WINDOW'))) {
                 console.log(`[Resolver] Falling back to system shell target: ${query}`);
                 return { bestMatch: { path: query, name: query, type: 'app' }, needsConfirmation: false };
            }
            // Extreme Phase 1 Fallback (Files just created, Indexer lagging behind)
            const fallbackPath = this._healPath(target);
            if (fs.existsSync(fallbackPath)) {
                 console.log(`[Resolver] FS Watcher Fallback Hit: Target physically exists on disk. bypassing index.`);
                 return { bestMatch: { path: fallbackPath, name: query, type: fs.statSync(fallbackPath).isDirectory() ? 'folder' : 'file' }, needsConfirmation: false };
            }
            throw new Error(`Target "${query}" could not be resolved in memory or index.`);
        }

        return resolved;
    }
}

module.exports = new Resolver();
