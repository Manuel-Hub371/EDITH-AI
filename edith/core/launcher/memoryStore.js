const fs = require('fs');
const path = require('path');

/**
 * MemoryStore (V42.0 Self-Learning Launcher)
 * Manages persistent storage of discovered application paths.
 */
class MemoryStore {
    constructor() {
        this.memoryPath = path.join(__dirname, '../../config/app_memory.json');
        this.memory = {};
        this._load();
    }

    _load() {
        try {
            if (fs.existsSync(this.memoryPath)) {
                const data = fs.readFileSync(this.memoryPath, 'utf8');
                this.memory = JSON.parse(data);
            } else {
                this.memory = {};
                this._save(); // Create empty file
            }
        } catch (error) {
            console.error('[MemoryStore] Load Error:', error.message);
            this.memory = {};
        }
    }

    _save() {
        try {
            const dir = path.dirname(this.memoryPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            
            fs.writeFileSync(this.memoryPath, JSON.stringify(this.memory, null, 2), 'utf8');
        } catch (error) {
            console.error('[MemoryStore] Save Error:', error.message);
        }
    }

    /**
     * Get path for an app keyword
     */
    get(keyword) {
        return this.memory[keyword.toLowerCase()] || null;
    }

    /**
     * Save/Learn a new app path
     */
    set(keyword, fullPath) {
        if (!keyword || !fullPath) return;
        this.memory[keyword.toLowerCase()] = fullPath;
        this._save();
    }

    /**
     * Get all cached memory
     */
    getAll() {
        return this.memory;
    }
}

module.exports = new MemoryStore();
