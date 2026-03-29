const aliasService = require('./alias');
const memoryService = require('./memory');

/**
 * Learning Service (v1.0)
 * 
 * The "Brain" for Phase 2. Handles ranking, scoring, and confidence assessment.
 */
class LearningService {
    constructor() {
        this.weights = {
            alias: 1.0,
            frequency: 0.8,
            recency: 0.6,
            search: 0.4
        };
        this.CONFIDENCE_THRESHOLD = 0.8;
    }

    /**
     * Re-rank search results and calculate confidence
     * @param {string} query - Original user input
     * @param {Array} rawResults - Results from SearchService (Phase 1)
     */
    async rankAndScore(query, rawResults) {
        const queryClean = query.toLowerCase().trim();

        // 1. Check for Exact Alias Match (Highest Priority)
        const aliasEntry = await aliasService.resolve(queryClean);
        if (aliasEntry) {
            return {
                bestMatch: {
                    name: aliasEntry.alias,
                    path: aliasEntry.targetPath,
                    type: aliasEntry.type,
                    source: 'alias',
                    confidence: 1.0 
                },
                alternatives: [],
                needsConfirmation: false
            };
        }

        // 2. Enhance Raw Results with Memory Data 
        const scoredResults = await Promise.all(rawResults.map(async (res) => {
            const memoryScore = await memoryService.getFrecencyScore(res.path);
            
            // Step 2.1: Calculate Base Relevancy (Invert Fuse.js score)
            const searchRelevancy = 1 - (res.score || 0.5); 
            
            // Step 2.2: Calculate Memory Influence
            // If we have history, weight it heavily (60/40). 
            // If no history, trust the search relevancy (Thresholding).
            let finalScore;
            if (memoryScore > 0.1) {
                finalScore = (searchRelevancy * 0.4) + (memoryScore * 0.6);
            } else {
                // For new files, if search is an exact name match, boost it
                const isExactName = res.name.toLowerCase() === queryClean;
                finalScore = isExactName ? Math.max(searchRelevancy, 0.9) : searchRelevancy * 0.8;
            }

            return { ...res, finalScore };
        }));

        // 3. Sort by final score descending
        const sorted = scoredResults.sort((a, b) => b.finalScore - a.finalScore);

        if (sorted.length === 0) return null;

        const best = sorted[0];
        const confidence = best.finalScore;

        return {
            bestMatch: {
                ...best,
                source: 'learned_search',
                confidence
            },
            alternatives: sorted.slice(1, 4),
            needsConfirmation: confidence < this.CONFIDENCE_THRESHOLD
        };
    }
}

module.exports = new LearningService();
