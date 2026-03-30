const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

/**
 * NativePaths Utility (V54.1 - True-Native V2)
 * 
 * Provides dynamic, OS-aware resolution for special user folders using 
 * Windows Known Folder APIs via PowerShell GetFolderPath.
 */
class NativePaths {
    constructor() {
        this.cache = this._syncInitialize();
        this._logStartup();
    }

    /**
     * Synchronously initialize the path cache on module load.
     * Guaranteed to be available before Resolver/Indexer startup.
     */
    _syncInitialize() {
        const home = os.homedir();
        let paths = {
            desktop: path.join(home, 'Desktop'),
            documents: path.join(home, 'Documents'),
            downloads: path.join(home, 'Downloads'),
            music: path.join(home, 'Music'),
            pictures: path.join(home, 'Pictures'),
            videos: path.join(home, 'Videos'),
            home: home
        };

        if (process.platform === 'win32') {
            try {
                // Use GUID-based GetFolderPath for 100% accuracy (V54.1)
                const script = "$p = @{ " +
                    "desktop = [Environment]::GetFolderPath('Desktop'); " +
                    "documents = [Environment]::GetFolderPath('MyDocuments'); " +
                    "downloads = try { (New-Object -ComObject Shell.Application).Namespace('shell:Downloads').Self.Path } catch { $HOME + '\\Downloads' }; " +
                    "music = [Environment]::GetFolderPath('MyMusic'); " +
                    "pictures = [Environment]::GetFolderPath('MyPictures'); " +
                    "videos = [Environment]::GetFolderPath('MyVideos') " +
                    "}; $p | ConvertTo-Json";
                
                // Encode to Base64 to bypass shell escaping issues (UTF-16LE for PowerShell)
                const encoded = Buffer.from(script, 'utf16le').toString('base64');
                const result = execSync(`powershell -NoProfile -NonInteractive -EncodedCommand ${encoded}`, { encoding: 'utf8' });
                
                if (result) {
                    const parsed = JSON.parse(result);
                    Object.keys(parsed).forEach(k => {
                        if (parsed[k]) paths[k.toLowerCase()] = parsed[k];
                    });
                }
            } catch (err) {
                console.warn('[NativePaths] PS shell discovery failed, using environment fallbacks');
            }
        }
        return paths;
    }

    _logStartup() {
        console.log('--- EDITH Native System Detection ---');
        console.log(`[NativePaths] Desktop:   ${this.cache.desktop}`);
        console.log(`[NativePaths] Documents: ${this.cache.documents}`);
        console.log(`[NativePaths] Downloads: ${this.cache.downloads}`);
    }

    /**
     * Get a specific folder path.
     * @param {string} name - Folder name (desktop, documents, etc.)
     */
    get(name) {
        return this.cache[name.toLowerCase()] || path.join(this.cache.home, name);
    }

    /**
     * Get all primary root folders for scanning.
     */
    getRoots() {
        return [this.cache.desktop, this.cache.documents, this.cache.downloads];
    }

    /**
     * Get all known folders in a mapping for the Resolver.
     */
    getAll() {
        return this.cache;
    }
}

module.exports = new NativePaths();
