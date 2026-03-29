const mongoose = require('mongoose');

/**
 * Command History Schema (Phase 2: Pattern Recognition)
 * 
 * Tracks every user command and its successful resolution for long-term learning.
 */
const commandHistorySchema = new mongoose.Schema({
    commandText: {
        type: String,
        required: true,
        index: true
    },
    intent: {
        type: String,
        required: true
    },
    resolvedPath: {
        type: String
    },
    success: {
        type: Boolean,
        default: true
    },
    metadata: {
        hour: { type: Number }, // hour of day (0-23)
        dayOfWeek: { type: Number } // 0-6
    }
}, {
    timestamps: true
});

const CommandHistory = mongoose.model('CommandHistory', commandHistorySchema);

module.exports = CommandHistory;
