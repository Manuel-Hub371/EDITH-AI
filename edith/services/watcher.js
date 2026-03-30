const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs').promises;
const nativePaths = require('../core/utils/native_paths');
const FileIndex = require('../database/file_index.model');

/**
 * Watcher Service (v1.0)
 * 
 * Provides real-time synchronization between the filesystem and MongoDB.
 * Listens for file/folder creation, deletion, and modification.
 */
class Watcher {
    constructor() {
        // Synchronously initialize watch paths (V54.1)
        this.watchPaths = nativePaths.getRoots();
        this.watcher = null;
    }

    /**
     * Start the watching service
     */
    start() {
        console.log('[Watcher] Initializing real-time file monitoring...');

        this.watcher = chokidar.watch(this.watchPaths, {
            persistent: true,
            ignoreInitial: true, // Only watch for NEW changes
            followSymlinks: false, // Prevent EPERM on virtual Windows folders
            awaitWriteFinish: {
                stabilityThreshold: 2000,
                pollInterval: 100
            },
            ignored: /(^|[\/\\])\../ // Ignore hidden files
        });

        // Event Listeners
        this.watcher
            .on('add', (filePath) => this.handleUpsert(filePath, 'file'))
            .on('change', (filePath) => this.handleUpsert(filePath, 'file'))
            .on('unlink', (filePath) => this.handleRemove(filePath))
            .on('addDir', (dirPath) => this.handleUpsert(dirPath, 'directory'))
            .on('unlinkDir', (dirPath) => this.handleRemove(dirPath))
            .on('error', (error) => {
                if (error.code === 'EPERM') return;
                console.error('[Watcher] Error:', error.message);
            });

        console.log('[Watcher] Monitoring established on core user directories.');
    }

    /**
     * Synchronize additions or modifications to DB
     */
    async handleUpsert(filePath, type) {
        try {
            const stats = await fs.stat(filePath);
            const updateData = {
                name: path.basename(filePath),
                path: filePath,
                type: type,
                extension: type === 'file' ? path.extname(filePath).toLowerCase() : '',
                lastModified: stats.mtime,
                size: stats.size
            };

            await FileIndex.updateOne(
                { path: filePath },
                { $set: updateData },
                { upsert: true }
            );

            console.log(`[Watcher] Synced ${type}: ${path.basename(filePath)}`);
        } catch (err) {
            console.error('[Watcher] Upsert Error:', err.message);
        }
    }

    /**
     * Remove deleted items from DB
     */
    async handleRemove(filePath) {
        try {
            await FileIndex.deleteOne({ path: filePath });
            console.log(`[Watcher] Removed: ${path.basename(filePath)}`);
        } catch (err) {
            console.error('[Watcher] Remove Error:', err.message);
        }
    }

    /**
     * Stop the watcher
     */
    stop() {
        if (this.watcher) {
            this.watcher.close();
            console.log('[Watcher] Service stopped.');
        }
    }
}

module.exports = new Watcher();
