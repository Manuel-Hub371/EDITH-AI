const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const axios = require('axios');
const fs = require('fs');

/**
 * OpenRouter API Client (Phase 4 — V55.1)
 * 
 * Reusable client for routing complex reasoning tasks to OpenRouter's
 * advanced LLMs (GPT-4 Turbo, Claude, etc.).
 * Includes rate limiting, audit logging, and response normalization.
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4-turbo';
const LOG_PATH = path.join(__dirname, '../logs/openrouter_audit.log');

// EDITH System Prompt — identical schema to ai.py for unified output
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
- FILES & FOLDERS: CREATE_FILE (new file), CREATE_FOLDER, DELETE_FILE, DELETE_FOLDER, MOVE_FILE (or "move it to"), MOVE_FOLDER, RENAME_FILE, RENAME_FOLDER, WRITE_FILE (overwrite or "save as"), APPEND_FILE, READ_FILE, COPY_FILE, COPY_FOLDER, OPEN_PATH, OPEN_FILE
- APPS: OPEN_APPLICATION, CLOSE_APPLICATION, MINIMIZE_WINDOW, MAXIMIZE_WINDOW, FOCUS_WINDOW
- SYSTEM: ADJUST_VOLUME, ADJUST_BRIGHTNESS, SHUTDOWN_SYSTEM, RESTART_SYSTEM, SYSTEM_SLEEP, SYSTEM_STATUS

[RULES]
1. For multi-step tasks, break them into sequential intents within the "actions" array.
2. Use "confidence" to express how certain you are about the user's overall intent (0.0–1.0).
3. If the task is purely conversational, use mode "chat" with an empty "actions" array.
4. No Markdown. Raw JSON ONLY.
5. For chained file operations, always generate explicit parent directories for subsequent steps based on prior steps (e.g. "Desktop/Folder/File") instead of relative pronouns like "in it" or "there".
6. STRICT INTENT SAFETY: If the user says "create", "make", "save", or "write", you MUST use CREATE_FILE, CREATE_FOLDER, or WRITE_FILE. NEVER use OPEN_FILE for these actions. OPEN_FILE is strictly for viewing existing assets. If a target doesn't exist yet, you MUST create it first in the action sequence.
7. MULTI-STEP DETECTION: Detect sequential connectors like "then", "after", "finally", "and", "next" in the user's Natural Language and split the instructions into discrete action objects within the "actions" array.`;

// ================================================================
// RATE LIMITER — Token Bucket (20 requests/minute)
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

    get remaining() {
        const now = Date.now();
        this.timestamps = this.timestamps.filter(t => now - t < this.windowMs);
        return Math.max(0, this.maxRequests - this.timestamps.length);
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
        console.error('[OpenRouter] Audit log write failed:', err.message);
    }
}

// ================================================================
// CORE API CALL
// ================================================================
async function query(userMessage, history = [], context = null) {
    if (!API_KEY) {
        throw new Error('OPENROUTER_API_KEY is not configured in .env');
    }

    if (!limiter.canProceed()) {
        throw new Error(`OpenRouter rate limit exceeded (${limiter.maxRequests}/min). Try again shortly.`);
    }

    // Build conversation messages
    const messages = [{ role: 'system', content: SYSTEM_PROMPT }];

    // Inject system context if available
    if (context) {
        messages.push({
            role: 'system',
            content: `[CONTEXT MEMORY/OS STATE]\n${JSON.stringify(context, null, 2)}`
        });
    }

    // Add conversation history
    for (const h of history) {
        messages.push({
            role: h.role === 'ai' ? 'assistant' : 'user',
            content: h.text
        });
    }

    // Add the current user message
    messages.push({ role: 'user', content: userMessage });

    const startTime = Date.now();

    try {
        const response = await axios.post(OPENROUTER_URL, {
            model: MODEL,
            messages,
            temperature: 0.7,
            max_tokens: 800,
            response_format: { type: 'json_object' }
        }, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://edith-ai.local',
                'X-Title': 'EDITH AI'
            },
            timeout: 30000
        });

        const latency = Date.now() - startTime;
        const choice = response.data?.choices?.[0];
        const rawText = choice?.message?.content || '';
        const usage = response.data?.usage || {};

        // Audit log
        logAudit({
            model: MODEL,
            latency_ms: latency,
            tokens: usage,
            status: 'success',
            prompt_preview: userMessage.substring(0, 80)
        });

        console.log(`[OpenRouter] ✅ ${MODEL} responded in ${latency}ms (${usage.total_tokens || '?'} tokens)`);

        return rawText;

    } catch (err) {
        const latency = Date.now() - startTime;
        const errMsg = err.response?.data?.error?.message || err.message;

        logAudit({
            model: MODEL,
            latency_ms: latency,
            status: 'error',
            error: errMsg,
            prompt_preview: userMessage.substring(0, 80)
        });

        console.error(`[OpenRouter] ❌ Failed (${latency}ms): ${errMsg}`);
        throw new Error(`OpenRouter API error: ${errMsg}`);
    }
}

module.exports = {
    query,
    limiter,
    MODEL
};
