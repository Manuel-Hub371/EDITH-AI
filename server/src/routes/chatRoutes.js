const express = require('express');
const {
    sendMessage,
    getConversations,
    getChatHistory,
    deleteConversation,
    renameConversation,
    archiveConversation,
    unarchiveConversation
} = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, sendMessage);
router.get('/conversations', protect, getConversations);
router.get('/:conversationId', protect, getChatHistory);
router.delete('/conversations/:id', protect, deleteConversation);
router.patch('/conversations/:id/rename', protect, renameConversation);
router.patch('/conversations/:id/archive', protect, archiveConversation);
router.patch('/conversations/:id/unarchive', protect, unarchiveConversation);

module.exports = router;
