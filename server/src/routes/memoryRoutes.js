const express = require('express');
const Memory = require('../models/Memory');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// @desc    Get all memories for user
// @route   GET /api/memory
router.get('/', protect, async (req, res) => {
    try {
        const memories = await Memory.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json(memories);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// @desc    Store a manual memory
// @route   POST /api/memory
router.post('/', protect, async (req, res) => {
    try {
        const memory = await Memory.create({
            user: req.user._id,
            content: req.body.content
        });
        res.status(201).json(memory);
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
});

module.exports = router;
