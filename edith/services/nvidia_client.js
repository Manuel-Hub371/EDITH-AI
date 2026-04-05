const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const axios = require('axios');
const fs = require('fs');

/**
 * NVIDIA AI API Client (Phase 4 — V56.0)
 * 
 * Reusable client for routing complex planning/multistep tasks to 
 * NVIDIA NIM's advanced LLMs (meta/llama-3.1-70b-instruct).
 * Includes rate limiting, audit logging, and identical response normalization.
 */

const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const API_KEY = process.env.NVIDIA_API_KEY;
const MODEL = process.env.NVIDIA_MODEL || 'meta/llama-3.1-70b-instruct';
const LOG_PATH = path.join(__dirname, '../logs/nvidia_audit.log');

// EDITH System Prompt — exact match to maintain pipeline integrity
const SYSTEM_PROMPT = `You are EDITH, a real-time OS-aware agent running on Windows.

[SCHEMA]
Respond with valid JSON ONLY:
{
  "mode": "chat" | "execution",
  "message": "natural human-friendly message outlining what you will do",
  "actions": [
    {
      "intent": "INTENT_NAME",
      "parameters": {
        "target": "name or absolute path",
        "destination": "target directory",
        "newName": "new name",
        "content": "file contents",
        "value": "system parameter value"
      }
    }
  ],
  "confidence": 0.0 to 1.0
}

[INTENTS]
- FILES & FOLDERS: CREATE_FILE, CREATE_FOLDER, DELETE_FILE, DELETE_FOLDER, MOVE_FILE, MOVE_FOLDER, RENAME_FILE, RENAME_FOLDER, WRITE_FILE, APPEND_FILE, READ_FILE, COPY_FILE, COPY_FOLDER, OPEN_PATH, OPEN_FILE
- APPS: OPEN_APPLICATION, CLOSE_APPLICATION, MINIMIZE_WINDOW, MAXIMIZE_WINDOW, FOCUS_WINDOW
- SYSTEM: ADJUST_VOLUME, ADJUST_BRIGHTNESS, SHUTDOWN_SYSTEM, RESTART_SYSTEM, SYSTEM_SLEEP, SYSTEM_STATUS

[RULES]
1. For multi-step tasks, break them into sequential intents within the "actions" array.
2. Use "confidence" to express how certain you are about the user's overall intent (0.0–1.0).
3. If the task is purely conversational, use mode "chat" with an empty "actions" array.
4. No Markdown. Raw JSON ONLY.`;

// ================================================================
// RATE LIMITER
// ================================================================
class RateLimiter {
    constructor(maxRequests = 20, windowMs = 60000) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.timestamps = [];
    }

    canProceed() {
        const now = Date.now();
        this.timestamps = this.timestamps.filter(t => now - t < this.windowMs);
        if (this.timestamps.length >= this.maxRequests) return false;
        this.timestamps.push(now);
        return true;
    }
}

const limiter = new RateLimiter(20, 60000);

// ================================================================
// AUDIT LOGGER
// ================================================================
function logAudit(entry) {
    try {
        const dir = path.dirname(LOG_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const line = `[${new Date().toISOString()}] ${JSON.stringify(entry)}\n`;
        fs.appendFileSync(LOG_PATH, line);
    } catch (err) {
        console.error('[NVIDIA] Audit log write failed:', err.message);
    }
}

// ================================================================
// CORE API CALL
// ================================================================
async function query(userMessage, history = [], context = null) {
    if (!API_KEY) {
        throw new Error('NVIDIA_API_KEY is not configured in .env');
    }

    if (!limiter.canProceed()) {
        throw new Error(`NVIDIA rate limit exceeded (${limiter.maxRequests}/min). Try again shortly.`);
    }

    const messages = [{ role: 'system', content: SYSTEM_PROMPT }];

    if (context) {
        messages.push({
            role: 'user', // Note: Some models prefer context via user or assistant, but system is okay for llama-3
            content: `[CONTEXT MEMORY/OS STATE]\n${JSON.stringify(context, null, 2)}`
        });
    }

    for (const h of history) {
        messages.push({
            role: h.role === 'ai' ? 'assistant' : 'user',
            content: h.text
        });
    }

    messages.push({ role: 'user', content: userMessage });

    const startTime = Date.now();

    try {
        const response = await axios.post(NVIDIA_URL, {
            model: MODEL,
            messages,
            temperature: 0.7,
            max_tokens: 1024,
            response_format: { type: 'json_object' } // Enable JSON mode
        }, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: 30000
        });

        const latency = Date.now() - startTime;
        const choice = response.data?.choices?.[0];
        const rawText = choice?.message?.content || '';
        const usage = response.data?.usage || {};

        logAudit({
            model: MODEL,
            latency_ms: latency,
            tokens: usage,
            status: 'success',
            prompt_preview: userMessage.substring(0, 80)
        });

        console.log(`[NVIDIA] ✅ ${MODEL} responded in ${latency}ms (${usage.total_tokens || '?'} tokens)`);

        return rawText;

    } catch (err) {
        const latency = Date.now() - startTime;
        const errMsg = err.response?.data?.detail || err.response?.data?.error?.message || err.message;

        logAudit({
            model: MODEL,
            latency_ms: latency,
            status: 'error',
            error: errMsg,
            prompt_preview: userMessage.substring(0, 80)
        });

        console.error(`[NVIDIA] ❌ Failed (${latency}ms): ${errMsg}`);
        throw new Error(`NVIDIA API error: ${errMsg}`);
    }
}

module.exports = {
    query,
    limiter,
    MODEL
};
