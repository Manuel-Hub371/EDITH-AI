const path = require('path');
const os = require('os');
const fs = require('fs');
const Sandbox = require('../security/sandbox');

/**
 * Utility Controller (V38.1)
 * Handles path sanitization, OneDrive detection, and variable expansion.
 */
class Utils {
    constructor(baseSafeDir = os.homedir()) {
        this.baseSafeDir = baseSafeDir;
        this.sandbox = new Sandbox();
    }

    /**
     * Path Sanitizer (V38.1): Robust path resolution with multi-level OneDrive detection.
     */
    getSafePath(inputPath) {
        if (!inputPath) return '';
        let expandedPath = inputPath;

        // Path Healing: Catch and replace common placeholders hallucinated by AI
        const actualUser = os.userInfo().username;
        const placeholders = ['yourusername', 'myusername', 'username', '<username>', 'user_name', '{username}', '{user}'];
        placeholders.forEach(p => {
            const regex = new RegExp(`\\\\${p}\\\\`, 'gi');
            expandedPath = expandedPath.replace(regex, `\\${actualUser}\\`);
            // Also handle the case where it's at the end of the path
            if (expandedPath.toLowerCase().endsWith(`\\${p}`)) {
                expandedPath = expandedPath.substring(0, expandedPath.length - p.length) + actualUser;
            }
        });

        // Handle path expansion for %VAR% and $VAR
        expandedPath = expandedPath.replace(/%([^%]+)%/g, (_, n) => {
            const key = Object.keys(process.env).find(k => k.toUpperCase() === n.toUpperCase());
            return key ? process.env[key] : `%${n}%`;
        }).replace(/\$([A-Za-z0-9_]+)/g, (_, n) => {
            const key = Object.keys(process.env).find(k => k.toUpperCase() === n.toUpperCase());
            return key ? process.env[key] : `$${n}`;
        });

        // Normalize and resolve to absolute
        let fullPath = path.isAbsolute(expandedPath) ? expandedPath : path.resolve(this.baseSafeDir, expandedPath);
        fullPath = path.normalize(fullPath);

        // --- ONEDRIVE AUTO-REDIRECTION ---
        const onedrivePath = process.env.ONEDRIVE;
        if (onedrivePath) {
            const desktopRel = path.relative(path.join(this.baseSafeDir, 'Desktop'), fullPath);
            const docsRel = path.relative(path.join(this.baseSafeDir, 'Documents'), fullPath);

            // Redirect if the path is inside Desktop or Documents but they are managed by OneDrive
            if (!desktopRel.startsWith('..') && !desktopRel.includes('..')) {
                const liveDesktop = path.join(onedrivePath, 'Desktop');
                if (fs.existsSync(liveDesktop)) {
                    fullPath = path.join(liveDesktop, desktopRel);
                }
            } else if (!docsRel.startsWith('..') && !docsRel.includes('..')) {
                const liveDocs = path.join(onedrivePath, 'Documents');
                if (fs.existsSync(liveDocs)) {
                    fullPath = path.join(liveDocs, docsRel);
                }
            }
        }

        // --- SECURITY VALIDATION (Sandbox V38.1) ---
        this.sandbox.validatePath(fullPath);

        return fullPath;
    }
}

module.exports = Utils;
