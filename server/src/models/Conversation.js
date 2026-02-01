const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    title: {
        type: String,
        default: 'New Conversation',
    },
    lastMessage: {
        type: String,
    },
    isArchived: {
        type: Boolean,
        default: false,
    },
    titleModified: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

const Conversation = mongoose.model('Conversation', conversationSchema);
module.exports = Conversation;
