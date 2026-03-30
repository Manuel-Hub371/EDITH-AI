const fs = require('fs').promises;
const path = require('path');
const nativePaths = require('../core/utils/native_paths');
const FileIndex = require('../database/file_index.model');

/**
 * Indexer Service (v1.0)
 * 
 * Handles initial and incremental scanning of the filesystem.
 * Optimized with batching to avoid MongoDB bottlenecks.
 */
class Indexer {
    constructor() {
        this.batchSize = 500;
        this.rootPaths = nativePaths.getRoots();
        this.excludedDirs = ['node_modules', '.git', '$RECYCLE.BIN', 'System Volume Information'];
        console.log('[Indexer] Target roots:', this.rootPaths);
    }

    /**
     * Start the full system scan
     */
    async startFullScan() {
        console.log('[Indexer] Starting full filesystem index...');
        const startTime = Date.now();

        for (const root of this.rootPaths) {
            console.log(`[Indexer] Scanning entry point: ${root}`);
            try {
                await this.scanDirectory(root);
            } catch (err) {
                console.error(`[Indexer] Error scanning ${root}:`, err.message);
            }
        }

        const duration = (Date.now() - startTime) / 1000;
        console.log(`[Indexer] Scan completed in ${duration}s`);
    }

    /**
     * Recursive directory scanner with batching
     */
    async scanDirectory(dirPath) {
        let currentBatch = [];

        async function walk(currentPath) {
            try {
                const stats = await fs.stat(currentPath);
                currentBatch.push({
                    name: path.basename(currentPath) || currentPath,
                    path: currentPath,
                    type: 'directory',
                    extension: '',
                    lastModified: stats.mtime,
                    size: stats.size
                });

                const files = await fs.readdir(currentPath, { withFileTypes: true });

                for (const file of files) {
                    const fullPath = path.join(currentPath, file.name);

                    if (file.isDirectory()) {
                        if (this.excludedDirs.includes(file.name)) continue;
                        await walk.call(this, fullPath); 
                    } else {
                        const fileStats = await fs.stat(fullPath);
                        currentBatch.push({
                            name: file.name,
                            path: fullPath,
                            type: 'file',
                            extension: path.extname(file.name).toLowerCase(),
                            lastModified: fileStats.mtime,
                            size: fileStats.size
                        });

                        if (currentBatch.length >= this.batchSize) {
                            await this.flushBatch(currentBatch);
                            currentBatch = [];
                        }
                    }
                }
            } catch (err) {}
        }

        await walk.call(this, dirPath);
        if (currentBatch.length > 0) {
            await this.flushBatch(currentBatch);
        }
    }

    /**
     * Bulk upsert to MongoDB
     */
    async flushBatch(batch) {
        try {
            const operations = batch.map(file => ({
                updateOne: {
                    filter: { path: file.path },
                    update: { $set: file },
                    upsert: true
                }
            }));

            await FileIndex.bulkWrite(operations);
            console.log(`[Indexer] Indexed ${batch.length} files...`);
        } catch (err) {
            console.error('[Indexer] Batch flush error:', err.message);
        }
    }

    /**
     * Recursive path healer (V53.1)
     * Ensures all children paths are updated when a parent is renamed/moved.
     */
    async updatePathRecursively(oldPath, newPath) {
        try {
            console.log(`[Indexer] Healing paths: ${oldPath} -> ${newPath}`);
            const escapedOldPath = oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            
            // Find all entries that start with oldPath
            const items = await FileIndex.find({ 
                path: { $regex: new RegExp('^' + escapedOldPath, 'i') } 
            });
            
            if (items.length === 0) return;

            const operations = items.map(item => {
                // Replace the prefix oldPath with newPath
                const updatedPath = item.path.replace(new RegExp('^' + escapedOldPath, 'i'), newPath);
                return {
                    updateOne: {
                        filter: { _id: item._id },
                        update: { 
                            $set: { 
                                path: updatedPath,
                                name: path.basename(updatedPath) || updatedPath
                            } 
                        }
                    }
                };
            });

            await FileIndex.bulkWrite(operations);
            console.log(`[Indexer] Recursively healed ${items.length} file index entries.`);
        } catch (err) {
            console.error('[Indexer] Path healing fault:', err.message);
        }
    }
}

module.exports = new Indexer();
