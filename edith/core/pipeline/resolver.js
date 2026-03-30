const os = require('os');
const path = require('path');
const nativePaths = require('../utils/native_paths');
const searchService = require('../../services/search');
const learningService = require('../../services/learning');
const aliasService = require('../../services/alias');
const fs = require('fs');


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

    async _healPath(target) {
        if (!target) return target;
        
        const paths = nativePaths.getAll();
        const cleanTarget = target.toLowerCase().trim().replace(/\\/g, '/'); // Normalize slashes for matching
        const parts = cleanTarget.split('/');
        
        // 1. GUID-Based Resolve (V54.1 True-Native)
        // If the path starts with a known folder (desktop, documents, etc.),
        // swap it for the actual native shell path.
        const folderKey = parts[0];
        if (paths[folderKey]) {
            const baseFolderPath = paths[folderKey];
            
            if (parts.length === 1) {
                return baseFolderPath;
            } else {
                // Join the actual OS path with the rest of the sub-path
                return path.join(baseFolderPath, target.substring(parts[0].length).replace(/^[\\\/]+/, ''));
            }
        }

        // 2. Direct home directory normalization (handle ~/ or ~\)
        if (target.startsWith('~\\') || target.startsWith('~/')) {
            return path.join(paths.home, target.substring(2));
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

        let query = await this._healPath(target);

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
