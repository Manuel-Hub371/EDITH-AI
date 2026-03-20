const fs = require('fs');
const path = require('path');

/**
 * Content Processor Plugin (V38.0)
 * Handles reading, searching, and preparing data for AI linguistics.
 */
class ContentProcessor {
    constructor(utils) {
        this.utils = utils;
    }

    async execute(action) {
        const { intent, path: targetPath, query } = action;
        const safePath = this.utils.getSafePath(targetPath);

        switch (intent) {
            case 'READ_FILE':
            case 'SUMMARIZE_FILE': // Both require reading
            case 'PROCESS_CONTENT':
                return this.readFile(safePath);
            case 'SEARCH_FILE':
                return this.searchInFile(safePath, query);
            default:
                throw new Error(`Unsupported content intent: ${intent}`);
        }
    }

    readFile(targetPath) {
        if (fs.existsSync(targetPath)) {
            const content = fs.readFileSync(targetPath, 'utf8');
            return content;
        }
        throw new Error(`File not found: ${targetPath}`);
    }

    searchInFile(targetPath, query) {
        if (!query) throw new Error("Search query is missing.");
        const content = this.readFile(targetPath);
        const lines = content.split('\n');
        const matches = lines.filter(line => line.toLowerCase().includes(query.toLowerCase()));
        
        if (matches.length > 0) {
            return `Found ${matches.length} matches:\n${matches.slice(0, 5).join('\n')}${matches.length > 5 ? '\n...' : ''}`;
        }
        return `No matches found for "${query}" in ${path.basename(targetPath)}`;
    }
}

module.exports = ContentProcessor;
