const Fuse = require('fuse.js');
const FileIndex = require('../database/file_index.model');

/**
 * Search Service (v1.0)
 * 
 * Provides fuzzy search capabilities over the indexed filesystem.
 * Uses a hybrid approach: MongoDB Text Search + Fuse.js refinement.
 */
class SearchService {
    /**
     * Search for files/folders based on a query string
     * @param {string} query - The search term
     * @param {Object} options - Search options (limit, type, extension)
     */
    async find(query, options = {}) {
        const { limit = 10, type = null } = options;

        try {
            // 1. Broad MongoDB Search (Text Index)
            // We fetch more than we need to allow Fuse.js to rank them better.
            const filter = { $text: { $search: query } };
            if (type) filter.type = type;

            let results = await FileIndex.find(filter)
                .limit(100)
                .lean();

            // 2. Fallback: If no text match, try partial regex search
            if (results.length === 0) {
                const regex = new RegExp(query, 'i');
                results = await FileIndex.find({ name: regex })
                    .limit(100)
                    .lean();
            }

            if (results.length === 0) return [];

            // 3. Fuse.js Fuzzy Refinement
            const fuse = new Fuse(results, {
                keys: ['name', 'path'],
                threshold: 0.4, // Sensitivity (0.0 = exact, 1.0 = anything)
                includeScore: true
            });

            const fuzzyResults = fuse.search(query);

            // 4. Transform and Format
            return fuzzyResults.slice(0, limit).map(r => ({
                name: r.item.name,
                path: r.item.path,
                type: r.item.type,
                extension: r.item.extension,
                score: r.score,
                lastModified: r.item.lastModified
            }));
        } catch (err) {
            console.error('[SearchService] Search Error:', err.message);
            return [];
        }
    }

    /**
     * High-confidence single result provider
     */
    async findBestMatch(query) {
        const results = await this.find(query, { limit: 1 });
        return results.length > 0 ? results[0] : null;
    }
}

module.exports = new SearchService();
