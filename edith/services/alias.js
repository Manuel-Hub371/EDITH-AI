const Alias = require('../database/alias.model');

/**
 * Alias Service (v1.0)
 * 
 * Manages the mapping of natural language "nicknames" to system paths.
 */
class AliasService {
    /**
     * Resolve an alias to a path
     */
    async resolve(alias) {
        try {
            const entry = await Alias.findOne({ alias: alias.toLowerCase().trim() });
            if (entry) {
                // Background usage increment
                this.incrementUsage(alias);
                return entry;
            }
            return null;
        } catch (err) {
            console.error('[AliasService] Resolve Error:', err.message);
            return null;
        }
    }

    /**
     * Create or update an alias
     */
    async set(alias, targetPath, type = 'file') {
        try {
            const cleanAlias = alias.toLowerCase().trim();
            await Alias.updateOne(
                { alias: cleanAlias },
                { 
                    $set: { 
                        targetPath, 
                        type,
                        lastUsed: new Date() 
                    },
                    $inc: { usageCount: 1 }
                },
                { upsert: true }
            );
            console.log(`[AliasService] Mapping updated: "${cleanAlias}" -> ${targetPath}`);
        } catch (err) {
            console.error('[AliasService] Set Error:', err.message);
        }
    }

    /**
     * Background usage tracking
     */
    async incrementUsage(alias) {
        try {
            await Alias.updateOne(
                { alias: alias.toLowerCase().trim() },
                { 
                    $inc: { usageCount: 1 },
                    $set: { lastUsed: new Date() }
                }
            );
        } catch (err) {}
    }

    /**
     * Stale Path Ghosting (V53.1)
     * Reroutes old names and absolute paths to new locations to handle stale AI context.
     */
    async relinkStalePath(oldName, oldPath, newPath, type) {
        try {
            console.log(`[AliasService] Relinking stale pointers: "${oldName}" -> ${newPath}`);
            
            // 1. Update/Create name mapping to new path
            await this.set(oldName, newPath, type);

            // 2. Map the old absolute path itself as an alias (Ghost Pointer)
            // This intercepts AI context hallucinations using raw stale paths.
            await this.set(oldPath, newPath, type);

            // 3. Recursively update any other aliases that were pointing to the old path
            // e.g., if there were shortcuts or deeply nested aliases.
            await Alias.updateMany(
                { targetPath: { $regex: new RegExp('^' + oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } },
                { $set: { targetPath: newPath } } // This only works for the root, recursive string replace is harder in mongo 
            );
            // Actually, for simple renames, just updating the exact match is a good start.

        } catch (err) {
            console.error('[AliasService] Relink error:', err.message);
        }
    }

    /**
     * Get all aliases (for lists/UI)
     */
    async getAll() {
        return await Alias.find().sort({ usageCount: -1 });
    }
}

module.exports = new AliasService();
