const mongoose = require('mongoose');

const memorySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    content: {
        type: String,
        required: true,
    },
    memoryType: {
        type: String,
        enum: ['fact', 'preference', 'profile', 'work'],
        default: 'fact',
    },
    importance: {
        type: Number,
        default: 1,
    },
}, { timestamps: true });

const Memory = mongoose.model('Memory', memorySchema);
module.exports = Memory;
