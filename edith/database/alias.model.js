const mongoose = require('mongoose');

/**
 * Alias Schema (Phase 2: Self-Learning)
 * 
 * Maps user-defined or learned natural language to system paths.
 */
const aliasSchema = new mongoose.Schema({
    alias: { 
        type: String, 
        required: true,
        unique: true,
        index: true,
        lowercase: true
    },
    targetPath: { 
        type: String, 
        required: true,
        index: true
    },
    type: { 
        type: String, 
        enum: ['file', 'directory', 'app', 'url'],
        default: 'file'
    },
    usageCount: {
        type: Number,
        default: 0
    },
    lastUsed: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

const Alias = mongoose.model('Alias', aliasSchema);

module.exports = Alias;
