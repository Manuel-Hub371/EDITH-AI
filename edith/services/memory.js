const CommandHistory = require('../database/command_history.model');

/**
 * Memory Service (v1.0)
 * 
 * Handles long-term command history and pattern tracking.
 */
class MemoryService {
    /**
     * Log a command to history
     */
    async recordCommand(commandText, intent, resolvedPath = '', success = true) {
        try {
            const now = new Date();
            await CommandHistory.create({
                commandText: commandText.toLowerCase().trim(),
                intent,
                resolvedPath,
                success,
                metadata: {
                    hour: now.getHours(),
                    dayOfWeek: now.getDay()
                }
            });
        } catch (err) {
            console.error('[MemoryService] Record Error:', err.message);
        }
    }

    /**
     * Get usage frequency and recency for a specific path
     * Returns a score between 0 and 1
     */
    async getFrecencyScore(path) {
        try {
            const history = await CommandHistory.find({ resolvedPath: path })
                .sort({ createdAt: -1 })
                .limit(50);
            
            if (history.length === 0) return 0;

            // Frequency: more hits = higher score
            const freqScore = Math.min(history.length / 20, 1.0);

            // Recency: how long ago was the last hit
            const lastHit = history[0].createdAt;
            const hoursAgo = (new Date() - lastHit) / (1000 * 60 * 60);
            const recencyScore = Math.max(1 - (hoursAgo / 72), 0); // Decay over 3 days

            return (freqScore * 0.6) + (recencyScore * 0.4);
        } catch (err) {
            return 0;
        }
    }
}

module.exports = new MemoryService();
