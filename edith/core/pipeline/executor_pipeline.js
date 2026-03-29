const automation = require('../../services/automation');
const processManager = require('../launcher/processManager');
const windowManager = require('../../system/window_manager');
const systemHub = require('../../system/index');
const aliasService = require('../../services/alias');
const indexer = require('../../services/indexer');
const fs = require('fs').promises;
const path = require('path');

/**
 * Executor Pipeline (V53.3)
 * 
 * Handles pre-execution validation, intent routing, and post-execution sync.
 */
class ExecutorPipeline {
    async execute(action, targetPath) {
        const { intent, parameters } = action;

        const isFileOperation = intent.includes('FILE') || intent.includes('FOLDER');
        
        // 1. Path Validation Gate (for non-creation FILE/FOLDER intents)
        if (isFileOperation) {
            if (!targetPath && !['CREATE_FILE', 'CREATE_FOLDER'].includes(intent)) {
                throw new Error(`Execution pipeline failed: Target path for intent "${intent}" is undefined.`);
            }

            if (targetPath) {
                try {
                    await fs.stat(targetPath);
                } catch (err) {
                    if (!['CREATE_FILE', 'CREATE_FOLDER'].includes(intent)) {
                        throw new Error(`Execution failed: Target path "${targetPath}" no longer exists.`);
                    }
                }
            }
        }

        // 2. Intent Routing
        console.log(`[ExecutorPipeline] Dispatching intent: ${intent} -> ${targetPath || 'N/A'}`);

        try {
            // A. File Operations (Phase 3 Shell-Backed)
            if (intent.includes('FILE') || intent.includes('FOLDER')) {
                if (intent === 'CREATE_FOLDER') {
                    const res = await automation.createFolder(targetPath);
                    await aliasService.set(path.basename(targetPath), targetPath, 'folder');
                    return res;
                }
                if (intent === 'CREATE_FILE') {
                    const res = await automation.createFile(targetPath, parameters.content);
                    await aliasService.set(path.basename(targetPath), targetPath, 'file');
                    return res;
                }
                if (intent === 'WRITE_FILE') return await automation.writeFile(targetPath, parameters.content);
                if (intent === 'APPEND_FILE') return await automation.appendFile(targetPath, parameters.content);
                
                if (intent === 'READ_FILE') {
                    const content = await automation.readFile(targetPath);
                    return { success: true, message: `Read successfully`, data: content };
                }
                
                if (intent === 'RENAME_FILE' || intent === 'RENAME_FOLDER') {
                    const newName = parameters.newName || parameters.target;
                    if (!newName) throw new Error("Execution pipeline failed: 'newName' is undefined for rename intent.");
                    const res = await automation.rename(targetPath, newName);
                    
                    // Ghost Link & Index Healing (V53.1)
                    const dir = path.dirname(targetPath);
                    const newFullPath = path.join(dir, newName);
                    const type = intent === 'RENAME_FOLDER' ? 'directory' : 'file';
                    const oldName = path.basename(targetPath);

                    // 1. Relink Names & stale paths as aliases
                    await aliasService.relinkStalePath(oldName, targetPath, newFullPath, type);
                    
                    // 2. Heal MongoDB FileIndex recursively
                    if (intent === 'RENAME_FOLDER') {
                        await indexer.updatePathRecursively(targetPath, newFullPath);
                    }
                    
                    return res;
                }
                
                if (intent === 'DELETE_FILE' || intent === 'DELETE_FOLDER') {
                    const res = await automation.delete(targetPath);
                    return { success: true, message: res, data: targetPath };
                }
                
                if (intent === 'MOVE_FILE' || intent === 'MOVE_FOLDER') {
                    const destination = parameters.destination;
                    const res = await automation.move(targetPath, destination);
                    
                    // Ghost Link & Index Healing (V53.1)
                    const newName = path.basename(targetPath);
                    const newFullPath = path.join(destination, newName);
                    const type = intent === 'MOVE_FOLDER' ? 'directory' : 'file';

                    // 1. Relink stale paths for context redirects
                    await aliasService.relinkStalePath(newName, targetPath, newFullPath, type);

                    // 2. Heal MongoDB FileIndex recursively
                    if (intent === 'MOVE_FOLDER') {
                        await indexer.updatePathRecursively(targetPath, newFullPath);
                    }
                    
                    return res;
                }
                if (intent === 'COPY_FILE' || intent === 'COPY_FOLDER') return await automation.copy(targetPath, parameters.destination);
            }

            // B. App, File, and Folder Launching (Phase 3 Process-Backed)
            if (intent === 'OPEN_PATH') {
                await processManager.openPath(targetPath);
                return { success: true, message: `Opening ${path.basename(targetPath)} folder...`, data: targetPath };
            }
            if (intent === 'OPEN_FILE') {
                await processManager.openPath(targetPath);
                return { success: true, message: `Opening ${path.basename(targetPath)}...`, data: targetPath };
            }
            if (intent === 'OPEN_APPLICATION' || intent === 'OPEN_APP') {
                const res = await processManager.launchApp(targetPath);
                const appName = path.basename(targetPath, path.extname(targetPath));
                const humanName = appName.charAt(0).toUpperCase() + appName.slice(1);
                return { success: true, message: `Opening ${humanName}...`, data: res };
            }
            if (intent === 'CLOSE_APPLICATION' || intent === 'CLOSE_APP') {
                const res = await processManager.closeApplication(targetPath);
                return { success: true, message: res, data: targetPath };
            }
            
            // Route Window & Hardware actions through SystemHub for rate limiting (V47.1)
            if ([
                'FOCUS_WINDOW', 'MINIMIZE_WINDOW', 'MAXIMIZE_WINDOW', 'RESTORE_WINDOW', 
                'ADJUST_VOLUME', 'ADJUST_BRIGHTNESS'
            ].includes(intent)) {
                if (!systemHub.isInitialized) await systemHub.initialize();
                const res = await systemHub.execute({ ...action, parameters: { ...parameters, target: targetPath } });
                return { success: true, message: typeof res === 'string' ? res : "Operation completed.", data: res };
            }

            throw new Error(`ExecutorPipeline: Intent "${intent}" is not supported.`);
            
        } catch (error) {
            return { success: false, message: error.message, data: null };
        }
    }
}

module.exports = new ExecutorPipeline();
