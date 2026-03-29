const mongoose = require('mongoose');

/**
 * File Index Schema (Phase 1: Dynamic Discovery)
 * 
 * Optimized for fast fuzzy search and real-time tracking.
 */
const fileIndexSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true,
        index: true 
    },
    path: { 
        type: String, 
        required: true, 
        unique: true,
        index: true
    },
    type: { 
        type: String, 
        enum: ['file', 'directory'],
        default: 'file'
    },
    extension: { 
        type: String, 
        default: ''
    },
    lastModified: { 
        type: Date, 
        default: Date.now 
    },
    size: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Compound index for optimized lookup
fileIndexSchema.index({ name: 'text' });

const FileIndex = mongoose.model('FileIndex', fileIndexSchema);

module.exports = FileIndex;
