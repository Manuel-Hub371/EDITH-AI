const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const axios = require('axios');
const openRouter = require('./openrouter_client');
const nvidia = require('./nvidia_client');
const fs = require('fs');

// System Trace Logging
const Tracer = require('./tracer');

/**
 * AI Gateway (Phase 4 — V55.1)
 * 
 * Central intelligence router for EDITH. Classifies task complexity
 * and routes to the optimal API backend:
 *   - Simple tasks → Google AI (ai.py :8000)
 *   - Complex reasoning → OpenRouter (GPT-4 Turbo)
 * 
 * Provides cross-API fallback and unified response normalization.
 */

const GOOGLE_AI_URL = process.env.AI_BACKEND_URL || 'http://127.0.0.1:8000';
const LOG_PATH = path.join(__dirname, '../logs/gateway_audit.log');

// ================================================================
// TASK COMPLEXITY CLASSIFIER
// ================================================================

// Signals that indicate tasks best suited for NVIDIA NIM (Planning, Multistep)
const NVIDIA_SIGNALS = [
    /\b(organize|sort|clean up|restructure|categorize|arrange)\b/i,
    /\b(analyze|summarize|review)\b/i,
    /\b(first|then|after that|next|finally|followed by|step \d)\b/i,
    /\b(and then|and also|afterwards|sequential|sequence)\b/i,
    /\b(and save|and create|and move|and rename|and then create)\b/i
];

// Signals that indicate tasks best suited for OpenRouter (Code creation, deep logic)
const OPENROUTER_SIGNALS = [
    /\b(explain|compare|evaluate)\b/i,
    /\b(find all|list all|scan all|check all|audit)\b.*\b(and|then|also)\b/i,
    /\b(write a\s(\w+\s)?script|write code|generate code|create a\s(\w+\s)?program)\b/i,
    /\b(why does|how does|what causes|explain why)\b/i,
    /\b(suggest|recommend|advise|help me decide)\b/i,
    /\b(largest files|biggest folders|disk usage|storage analysis)\b/i,
    /\b(count|total|average|statistics|breakdown)\b/i,
    /\b(what are the differences|pros and cons|trade-?offs)\b/i
];

// Signals that indicate a simple, direct task (override complex)
const SIMPLE_OVERRIDES = [
    /^(open|close|minimize|maximize|focus)\s/i,
    /^(set|adjust)\s(volume|brightness)\s/i,
    /^(create|delete|rename|move|copy)\s(a\s)?(file|folder)\s/i,
    /^(read)\s/i,
    /^(write|append)\s(?!a\s(\w+\s)?(script|program|code))/i, // "Write a Python script" → complex, "Write to file" → simple
    /^(what time|what date|what day)\b/i,
    /^(shut ?down|restart|sleep)\b/i
];

/**
 * Classify task complexity.
 * @param {string} message - User's natural language message
 * @returns {{ route: 'google'|'openrouter', confidence: number, reason: string }}
 */
function classifyTask(message) {
    const trimmed = message.trim();

    // 1. Initial Signal Scoring
    let nvidiaScore = 0;
    let openrouterScore = 0;
    let matchedSignal = '';

    for (const pattern of NVIDIA_SIGNALS) {
        if (pattern.test(trimmed)) {
            nvidiaScore++;
            if (!matchedSignal) matchedSignal = `NVIDIA: ${pattern.source.substring(0, 30)}`;
        }
    }

    for (const pattern of OPENROUTER_SIGNALS) {
        if (pattern.test(trimmed)) {
            openrouterScore++;
            if (!matchedSignal) matchedSignal = `OR: ${pattern.source.substring(0, 30)}`;
        }
    }

    // 2. Length & Structural Heuristics
    if (trimmed.length > 200) nvidiaScore += 0.5;
    if (trimmed.split(/[.!?]/).length > 3) nvidiaScore += 0.5;

    // 3. LIVE TRACE FOR SCORING (CRITICAL FOR DEBUGGING)
    Tracer.nlp(`Classification Scores: NVIDIA=${nvidiaScore}, OR=${openrouterScore}`);

    // 4. MANDATORY REASONING GATE
    // If ANY complex signals exist, we MUST route to a reasoning engine to ensure intent decomposition.
    if (nvidiaScore >= 1 && nvidiaScore >= openrouterScore) {
        return {
            route: 'nvidia',
            confidence: Math.min(0.95, 0.6 + nvidiaScore * 0.1),
            reason: `Planning signal detected: ${matchedSignal}`
        };
    } else if (openrouterScore >= 1) {
        return {
            route: 'openrouter',
            confidence: Math.min(0.95, 0.6 + openrouterScore * 0.1),
            reason: `Reasoning signal detected: ${matchedSignal}`
        };
    }

    // 5. SIMPLE OVERRIDES (ONLY for single-step direct tasks with no complex connectors)
    for (const pattern of SIMPLE_OVERRIDES) {
        if (pattern.test(trimmed)) {
            return { route: 'google', confidence: 0.95, reason: 'Simple direct command' };
        }
    }

    // 6. Default Fallback
    return { route: 'google', confidence: 0.8, reason: 'Default simple routing' };
}

// ================================================================
// RESPONSE NORMALIZER
// ================================================================

/**
 * Normalize any AI response into the unified EDITH schema.
 * @param {string} rawText - Raw JSON string from either API
 * @param {string} source - 'google' or 'openrouter'
 * @returns {object} Normalized { mode, intent, parameters, confidence, message }
 */
function normalizeResponse(rawText, source) {
    try {
        let parsed = JSON.parse(rawText);

        // Handle nested structures from some models
        if (parsed.choices) {
            const content = parsed.choices[0]?.message?.content;
            if (content) parsed = JSON.parse(content);
        }

        // Normalize legacy single-intent into actions array
        let actions = parsed.actions || [];
        if (actions.length === 0 && parsed.intent) {
            actions = [{
                intent: parsed.intent,
                parameters: parsed.parameters || {}
            }];
        }

        return {
            mode: parsed.mode || 'chat',
            intent: actions.length > 0 ? actions[0].intent : null, // legacy shorthand
            actions: actions,
            confidence: parsed.confidence || (source === 'openrouter' ? 0.9 : 0.8),
            message: parsed.message || parsed.response || '',
            _source: source
        };
    } catch (err) {
        // If parsing fails, wrap as a chat message
        return {
            mode: 'chat',
            intent: null,
            actions: [],
            confidence: 0.5,
            message: rawText || 'I had trouble processing that. Can you rephrase?',
            _source: source
        };
    }
}

// ================================================================
// AUDIT LOGGER
// ================================================================
function logGateway(entry) {
    try {
        const dir = path.dirname(LOG_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const line = `[${new Date().toISOString()}] ${JSON.stringify(entry)}\n`;
        fs.appendFileSync(LOG_PATH, line);
    } catch (err) { /* silent */ }
}

// ================================================================
// MAIN GATEWAY PROCESS
// ================================================================

/**
 * Process a user message through the AI Gateway.
 * Routes to Google AI or OpenRouter based on task complexity.
 * Falls back to the alternate API on failure.
 * 
 * @param {string} message - User's natural language message
 * @param {Array} history - Conversation history [{role, text}]
 * @param {object} context - System state context
 * @returns {object} Normalized AI response
 */
async function route(message, history = [], context = null) {
    const classification = classifyTask(message);
    const startTime = Date.now();

    console.log(`[Gateway] Route: ${classification.route.toUpperCase()} | Confidence: ${classification.confidence} | Reason: ${classification.reason}`);

    let result = null;
    let usedRoute = classification.route;

    // Ordered cascade based on primary route
    const cascade = classification.route === 'nvidia' 
        ? ['nvidia', 'openrouter', 'google']
        : classification.route === 'openrouter' 
            ? ['openrouter', 'nvidia', 'google']
            : ['google', 'nvidia', 'openrouter']; // If Google fails, try nvidia then OR

    let lastErr = null;

    for (let currentRoute of cascade) {
        try {
            usedRoute = currentRoute;
            console.log(`[Gateway] Attempting route: ${currentRoute.toUpperCase()}...`);

            if (currentRoute === 'nvidia') {
                const rawText = await nvidia.query(message, history, context);
                result = normalizeResponse(rawText, 'nvidia');
                break; // Success
            } else if (currentRoute === 'openrouter') {
                const rawText = await openRouter.query(message, history, context);
                result = normalizeResponse(rawText, 'openrouter');
                break; // Success
            } else {
                const aiResponse = await axios.post(`${GOOGLE_AI_URL}/process`, {
                    message, history, context
                }, { timeout: 30000, proxy: false });
                result = normalizeResponse(JSON.stringify(aiResponse.data), 'google');
                break; // Success
            }
        } catch (err) {
            console.warn(`[Gateway] Route ${currentRoute.toUpperCase()} failed: ${err.message}`);
            lastErr = err;
        }
    }

    if (!result) {
        console.error(`[Gateway] ALL APIs failed. Last error: ${lastErr.message}`);
        result = {
            mode: 'chat',
            intent: null,
            parameters: {},
            confidence: 0,
            message: 'All AI engine connections are temporarily unavailable. Please try again in a moment.',
            _source: 'fallback_exhausted'
        };
    }

    const latency = Date.now() - startTime;

    // Audit log
    logGateway({
        classified_route: classification.route,
        actual_route: usedRoute,
        reason: classification.reason,
        latency_ms: latency,
        mode: result.mode,
        intent: result.intent,
        confidence: result.confidence,
        prompt_preview: message.substring(0, 60)
    });

    console.log(`[Gateway] ✅ Responded via ${(result._source || usedRoute).toUpperCase()} in ${latency}ms | Mode: ${result.mode} | Intent: ${result.intent || 'N/A'}`);

    // TRACE LOGGING for EDITH Full Debug Mode
    const actionsDesc = result.actions && result.actions.length > 0 
        ? result.actions.map(a => a.intent).join(' → ')
        : (result.intent || 'NONE');
    
    Tracer.nlp(`Routed: ${(result._source || usedRoute).toUpperCase()} | Intent: ${actionsDesc}`);


    return result;
}

module.exports = {
    route,
    classifyTask,
    normalizeResponse
};
