const fs = require('fs');
const path = require('path');

/**
 * File Manager Plugin (V38.0)
 * Handles all filesystem-related intents.
 */
class FileManager {
    constructor(utils) {
        this.utils = utils;
    }

    async execute(action) {
        const { intent, name, path: targetPath, content, action: subAction } = action;
        const safePath = this.utils.getSafePath(targetPath || name);

        switch (intent) {
            case 'CREATE_FOLDER':
                return this.createFolder(safePath);
            case 'CREATE_FILE':
                return this.createFile(safePath, content, subAction === 'append');
            case 'DELETE_FILE':
            case 'DELETE_FOLDER':
                return this.deletePath(safePath);
            case 'MOVE_FILE':
            case 'MOVE_FOLDER':
                const destPath = this.utils.getSafePath(action.destination);
                return this.movePath(safePath, destPath);
            default:
                throw new Error(`Unsupported file intent: ${intent}`);
        }
    }

    createFolder(targetPath) {
        if (!fs.existsSync(targetPath)) {
            fs.mkdirSync(targetPath, { recursive: true });
            return `Folder created: ${path.basename(targetPath)}`;
        }
        return `Folder already exists: ${path.basename(targetPath)}`;
    }

    createFile(targetPath, content = '', append = false) {
        const parentDir = path.dirname(targetPath);
        if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true });
        }

        if (append) {
            fs.appendFileSync(targetPath, content + '\n');
            return `Appended to file: ${path.basename(targetPath)}`;
        } else {
            fs.writeFileSync(targetPath, content);
            return `File created: ${path.basename(targetPath)}`;
        }
    }

    deletePath(targetPath) {
        if (fs.existsSync(targetPath)) {
            const stats = fs.statSync(targetPath);
            if (stats.isDirectory()) {
                fs.rmSync(targetPath, { recursive: true, force: true });
                return `Folder deleted: ${path.basename(targetPath)}`;
            } else {
                fs.unlinkSync(targetPath);
                return `File deleted: ${path.basename(targetPath)}`;
            }
        }
        return `Path not found: ${path.basename(targetPath)}`;
    }

    movePath(src, dest) {
        if (fs.existsSync(src)) {
            const parentDir = path.dirname(dest);
            if (!fs.existsSync(parentDir)) {
                fs.mkdirSync(parentDir, { recursive: true });
            }
            fs.renameSync(src, dest);
            return `Moved ${path.basename(src)} to ${path.basename(dest)}`;
        }
        throw new Error(`Source path not found: ${src}`);
    }
}

module.exports = FileManager;
