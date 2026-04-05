const fs = require('fs').promises;
const path = require('path');
const executor = require('../executor');
const FileIndex = require('../../database/file_index.model');
const Alias = require('../../database/alias.model');
const Tracer = require('../tracer');

/**
 * Unified Automation Engine (v2.0)
 * 
 * Consolidates Hardware, System, and File automation into a single module.
 * All operations enforce synchronous indexing where applicable.
 */
class AutomationEngine {
    constructor() {
        this.fs = fs;
    }

    _escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // --- Helper: Synchronous Indexing ---
    async sync(filePath, type = 'file') {
        try {
            const stats = await this.fs.stat(filePath);
            const data = {
                name: path.basename(filePath),
                path: filePath,
                type: type,
                extension: type === 'file' ? path.extname(filePath).toLowerCase() : '',
                lastModified: stats.mtime,
                size: stats.size
            };
            await FileIndex.updateOne({ path: filePath }, { $set: data }, { upsert: true });
        } catch (err) {
            await FileIndex.deleteOne({ path: filePath });
        }
    }

    async recursivePathUpdate(oldDirPath, newDirPath) {
        const escaped = this._escapeRegExp(oldDirPath);
        const regex = new RegExp('^' + escaped, 'i');
        const results = await FileIndex.find({ path: regex });
        
        for (const doc of results) {
            const newPath = doc.path.replace(regex, newDirPath);
            await FileIndex.deleteOne({ _id: doc._id });
            await FileIndex.updateOne(
                { path: newPath },
                { $set: { ...doc.toObject(), _id: undefined, path: newPath, updatedAt: new Date() } },
                { upsert: true }
            );
        }
        
        await this.updateAliases(oldDirPath, newDirPath);
    }

    async updateAliases(oldPath, newPath) {
        try {
            const escaped = this._escapeRegExp(oldPath);
            const regex = new RegExp('^' + escaped, 'i');
            const results = await Alias.find({ targetPath: regex });
            
            for (const doc of results) {
                const updatedPath = doc.targetPath.replace(regex, newPath);
                await Alias.updateOne(
                    { _id: doc._id },
                    { $set: { targetPath: updatedPath, lastUsed: new Date() } }
                );
            }
        } catch (err) {
            console.error('[AutomationEngine] Phase 2 Sync Error:', err.message);
        }
    }

    // --- Folder Operations ---
    async createFolder(dirPath) {
        await executor.executeCMD(`mkdir "${dirPath}"`);
        await this.sync(dirPath, 'directory');
        return `Folder created: ${dirPath}`;
    }

    // --- File Operations ---
    async createFile(filePath, content = '') {
        Tracer.executor(`fs.writeFile "${filePath}"`);
        await this.fs.writeFile(filePath, content, 'utf8');
        await this.sync(filePath, 'file');
        Tracer.executor('SUCCESS');
        return `File created: ${filePath}`;
    }

    async readFile(filePath) {
        Tracer.executor(`fs.readFile "${filePath}"`);
        const stats = await this.fs.stat(filePath);
        if (stats.isDirectory()) {
            const files = await this.fs.readdir(filePath);
            Tracer.executor('SUCCESS');
            return `Contents of ${path.basename(filePath)}: ${files.join(', ')}`;
        }
        const content = await this.fs.readFile(filePath, 'utf8');
        Tracer.executor('SUCCESS');
        return content;
    }

    async writeFile(filePath, content) {
        Tracer.executor(`fs.writeFile "${filePath}"`);
        await this.fs.writeFile(filePath, content, 'utf8');
        await this.sync(filePath, 'file');
        Tracer.executor('SUCCESS');
        return `Updated: ${filePath}`;
    }

    async appendFile(filePath, content) {
        Tracer.executor(`fs.appendFile "${filePath}"`);
        await this.fs.appendFile(filePath, '\n' + content, 'utf8');
        await this.sync(filePath, 'file');
        Tracer.executor('SUCCESS');
        return `Appended to: ${filePath}`;
    }

    async move(source, destination) {
        if (!source || !destination) throw new Error("AutomationEngine.move: Missing source or destination.");
        const destPath = path.join(destination, path.basename(source));
        const stats = await this.fs.stat(source);
        
        // OS Execution via PowerShell for stability with spaces/drive letters
        await executor.executePS(`Move-Item -Path '${source}' -Destination '${destination}' -Force`);
        
        if (stats.isDirectory()) {
            await this.recursivePathUpdate(source, destPath);
        } else {
            await this.sync(source); // Deletes old record
            await this.sync(destPath);
            await this.updateAliases(source, destPath);
        }
        return { success: true, message: `Moved to: ${destination}`, data: { source, destination: destPath } };
    }

    async copy(source, destination) {
        if (!source || !destination) throw new Error("AutomationEngine.copy: Missing source or destination.");
        let destPath = destination;
        const destStats = await this.fs.stat(destination).catch(() => null);
        if (destStats && destStats.isDirectory()) {
            destPath = path.join(destination, path.basename(source));
        }

        if (source === destPath) {
            const ext = path.extname(source);
            const base = path.basename(source, ext);
            destPath = path.join(path.dirname(source), `${base} - Copy${ext}`);
        }

        const stats = await this.fs.stat(source);
        if (stats.isDirectory()) {
            await executor.executePS(`Copy-Item -Path '${source}' -Destination '${destPath}' -Recurse -Force`);
            this.sync(destPath, 'directory').catch(() => {});
        } else {
            await executor.executePS(`Copy-Item -Path '${source}' -Destination '${destPath}' -Force`);
            await this.sync(destPath);
        }
        return { success: true, message: `Copied to: ${destPath}`, data: { source, destination: destPath } };
    }

    async rename(oldPath, newName) {
        if (!oldPath || !newName) throw new Error("AutomationEngine.rename: Missing required arguments.");
        
        const dir = path.dirname(oldPath);
        const nameOnly = path.basename(newName); 
        const newPath = path.join(dir, nameOnly);
        
        const stats = await this.fs.stat(oldPath);
        
        // OS Execution via PowerShell Rename-Item (More robust than CMD rename)
        await executor.executePS(`Rename-Item -Path '${oldPath}' -NewName '${nameOnly}' -Force`);
        
        if (stats.isDirectory()) {
            await this.recursivePathUpdate(oldPath, newPath);
        } else {
            await this.sync(oldPath); 
            await this.sync(newPath);
            await this.updateAliases(oldPath, newPath);
        }
        return { success: true, message: `Renamed to: ${nameOnly}`, data: { oldPath, newPath } };
    }

    async delete(targetPath) {
        const stats = await this.fs.stat(targetPath);
        if (stats.isDirectory()) {
            await executor.executeCMD(`rmdir /S /Q "${targetPath}"`);
        } else {
            await executor.executeCMD(`del /F /Q "${targetPath}"`);
        }
        await this.sync(targetPath);
        return `Deleted: ${targetPath}`;
    }

    // --- Hardware Controls ---
    async setVolume(level) {
        const vol = Math.min(Math.max(parseInt(level) || 50, 0), 100);
        const cmd = `$obj = New-Object -ComObject WScript.Shell; for($i=0; $i -lt 50; $i++) { $obj.SendKeys([char]174) }; for($i=0; $i -lt (${vol}/2); $i++) { $obj.SendKeys([char]175) }`;
        await executor.executePS(cmd);
        return { success: true, message: `Volume set to ${vol}%`, data: { level: vol } };
    }

    async setBrightness(level) {
        const bright = Math.min(Math.max(parseInt(level) || 50, 0), 100);
        const cmd = `(Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1,${bright})`;
        await executor.executePS(cmd);
        return { success: true, message: `Brightness set to ${bright}%`, data: { level: bright } };
    }

    // --- System Power ---
    async shutdown() { return await executor.executeCMD('shutdown /s /t 0'); }
    async restart() { return await executor.executeCMD('shutdown /r /t 0'); }
}

module.exports = new AutomationEngine();
