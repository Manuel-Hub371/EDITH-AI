const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// @desc    Convert Speech to Text (STT)
// @route   POST /api/voice/stt
// @access  Private
// @desc    Convert Speech to Text (STT)
// @route   POST /api/voice/stt
// @access  Private
const speechToText = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No audio file uploaded' });
    }

    try {
        const audioPath = req.file.path;

        if (!process.env.OPENAI_API_KEY) {
            console.error("OpenAI API Key is missing in environment variables.");
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(500).json({ message: "Server configuration error: OpenAI API Key missing." });
        }

        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(audioPath),
            model: "whisper-1",
        });

        // Clean up uploaded file
        fs.unlinkSync(audioPath);

        res.json({ text: transcription.text });
    } catch (error) {
        console.error("STT Error:", error);
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); // cleanup on error
        res.status(500).json({ message: error.message });
    }
};

// @desc    Convert Text to Speech (TTS)
// @route   POST /api/voice/tts
// @access  Private
const textToSpeech = async (req, res) => {
    const { text } = req.body;

    if (!text) {
        return res.status(400).json({ message: 'Text is required' });
    }

    try {
        if (!process.env.OPENAI_API_KEY) {
            console.error("OpenAI API Key is missing in environment variables.");
            return res.status(500).json({ message: "Server configuration error: OpenAI API Key missing." });
        }

        const mp3 = await openai.audio.speech.create({
            model: "tts-1",
            voice: "alloy",
            input: text,
        });

        const buffer = Buffer.from(await mp3.arrayBuffer());

        // We can stream this back or save to a temp file/S3. 
        // Sending as base64 or direct stream is easiest for now.

        res.set('Content-Type', 'audio/mpeg');
        res.send(buffer);

    } catch (error) {
        console.error("TTS Error:", error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { speechToText, textToSpeech };
