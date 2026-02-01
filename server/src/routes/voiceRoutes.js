const express = require('express');
const multer = require('multer');
const { speechToText, textToSpeech } = require('../controllers/voiceController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Configure Multer for temporary storage
const upload = multer({ dest: 'uploads/' });

router.post('/stt', protect, upload.single('audio'), speechToText);
router.post('/tts', protect, textToSpeech);

module.exports = router;
