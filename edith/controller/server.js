const Sentry = require('@sentry/node');
const dotenv = require('dotenv');

// ── Sentry Initialization (Must be before other imports) ──────────────────
dotenv.config();
Sentry.init({
    dsn: process.env.SENTRY_DSN || "",
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 1.0,
    debug: false,
});

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const connectDB = require('../database/db');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Modular Imports (V38.1 Refresh)
const ActionDispatcher = require('./action_dispatcher');
const { validateAction } = require('./validator');

// Phase 1: High-Performance File Services
const indexer = require('../services/indexer');
const watcher = require('../services/watcher');

// Phase 2: Memory & Learning Services
const learningService = require('../services/learning');
const memoryService = require('../services/memory');
const aliasService = require('../services/alias');

// Phase 4: AI Gateway (Dual-API Router)
const aiGateway = require('../services/ai_gateway');

// System Trace Logging
const Tracer = require('../services/tracer');

connectDB();

const app = express();
const dispatcher = require('./action_dispatcher');

// --- CONTEXT MEMORY (V38.1) ---
const contextMemory = {
    last_path: '',
    last_app: '',
    last_file: '',
    last_folder: ''
};

// --- LOGGING SYSTEM (V38.1) ---
const logAction = (intent, target, result) => {
    const logPath = path.join(__dirname, '../logs/execution.log');
    const entry = `[${new Date().toISOString()}] ${intent} ${target || ''} ${result.toUpperCase()}\n`;
    fs.appendFileSync(path.join(__dirname, '../logs/execution.log'), entry, 'utf8');
};

app.use(cors({
    origin: '*', // For development/local use, allow anything. In production, this can be tightened.
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

const AI_URL = process.env.AI_BACKEND_URL || 'http://127.0.0.1:8000';

/**
 * Health Check for Electron Shell (V39)
 * Returns status and uptime — used by main.js to confirm the backend is online.
 */
app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), version: '52.3.0' });
});

const chatSchema = new mongoose.Schema({
    sessionId: { type: String, index: true, default: 'default' },
    user: String,
    ai: {
        response: String,
        mode: { type: String, default: 'chat' },
        actions: Array
    },
    timestamp: { type: Date, default: Date.now }
});
const Chat = mongoose.model('Chat', chatSchema);

/**
 * Core Chat Relay API (V38.1)
 */
app.post('/api/chat', async (req, res) => {
    const { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ status: "error", message: "Message is required." });

    Tracer.edith(`Input: ${message}`);

    try {
        const historyData = await Chat.find({ sessionId }).sort({ timestamp: -1 }).limit(10);
        const history = [];
        historyData.reverse().forEach(h => {
            if (h.user) history.push({ role: "user", text: h.user });
            if (h.ai) {
                let text = typeof h.ai === 'object' ? h.ai.message || h.ai.response : h.ai;
                if (h.ai && h.ai.intent) {
                    text = `${text} [Intent: ${h.ai.intent}]`.trim();
                }
                if (text) history.push({ role: "ai", text });
            }
        });

        // --- SYNC SYSTEM CONTEXT (V38.1.3) ---
        const systemSnapshot = dispatcher.systemHub.state.get();
        const aiContext = {
            ...contextMemory,
            system_state: {
                cpu: `${systemSnapshot.telemetry.cpu_load}%`,
                ram: `${systemSnapshot.telemetry.memory_usage.percent}% (${systemSnapshot.telemetry.memory_usage.used}/${systemSnapshot.telemetry.memory_usage.total}GB)`,
                battery: `${systemSnapshot.telemetry.battery.percent}% ${systemSnapshot.telemetry.battery.is_charging ? '(Charging)' : ''}`,
                active_window: systemSnapshot.active_window.title,
                os: systemSnapshot.os_info.version,
                disks: systemSnapshot.disks.map(d => `${d.mount} ${d.percent}% full`).join(', '),
                running_apps_count: systemSnapshot.running_apps.length,
                top_apps: systemSnapshot.running_apps.sort((a,b) => b.cpu - a.cpu).slice(0, 5).map(a => a.name)
            }
        };

        // Phase 4: Route through AI Gateway (classifies complexity → Google AI or OpenRouter)
        const aiAction = await aiGateway.route(message, history, aiContext);
        const chatRecord = new Chat({ sessionId, user: message, ai: aiAction });
        
        // Fire-and-forget save to database (Eliminates I/O wait)
        chatRecord.save().catch(err => console.error('[DB] Background save failed:', err.message));

        if (aiAction.mode === 'chat') {
            Tracer.response(aiAction.message || aiAction.response);
        }

        res.json({ status: "success", action: aiAction });

    } catch (err) {
        res.status(500).json({ status: "error", message: "AI Engine Uplink Failed." });
    }
});

/**
 * Execution Pipeline (V39.0 - Unified Sandbox Check)
 */
const pendingActions = new Map(); // Store risky actions waiting for confirmation
const pendingChoices = new Map(); // Store low-confidence choices for user selection

app.post('/api/execute', async (req, res) => {
    const { action, sessionId = 'default' } = req.body;
    if (!action) return res.status(400).json({ status: "error", message: "No action provided." });

    try {
        // 1. Schema Validation (now checks for action.actions array from Phase 4 Gateway)
        validateAction(action);
        
        let executedSteps = [];
        let failedSteps = [];
        let finalMessage = "Actions executed successfully.";

        for (let i = 0; i < action.actions.length; i++) {
            const step = action.actions[i];
            const target = step.parameters ? (step.parameters.path || step.parameters.app || step.parameters.target) : '';
            
            // No pre-step log here, we log after completion of each step as requested.


            // Build the individual action object for the dispatcher to maintain Phase 1-3 compatibility
            const stepAction = {
                intent: step.intent,
                parameters: step.parameters || {}
            };

            const result = await dispatcher.dispatch(stepAction);

            // --- PHASE 2/3: Check for Confirmation/Choice ---
            if (result && result.status === 'NEED_CONFIRMATION') {
                const actionId = Math.random().toString(36).substring(7);
                stepAction.parameters = { ...stepAction.parameters, path: result.target || target }; // Update parsed path
                
                // Suspend the multi-step queue, wait for confirmation
                pendingActions.set(actionId, { action: stepAction, sessionId, remainingSteps: action.actions.slice(i + 1) });
                
                return res.json({ 
                    status: "NEED_CONFIRMATION", 
                    message: `Safety Sandbox: High-risk action '${step.intent}' requires confirmation.`,
                    actionId,
                    intent: step.intent,
                    executedSteps,
                    failedSteps
                });
            }

            if (result && result.status === 'NEED_CHOICE') {
                const choiceId = Math.random().toString(36).substring(7);
                pendingChoices.set(choiceId, { query: result.query, alternatives: result.alternatives, action: stepAction, remainingSteps: action.actions.slice(i + 1) });
                return res.json({
                    status: "NEED_CHOICE",
                    message: "I found multiple matches. Which one did you mean?",
                    choices: result.alternatives,
                    choiceId,
                    executedSteps,
                    failedSteps
                });
            }

            if (stepAction.parameters && stepAction.parameters.path) contextMemory.last_path = stepAction.parameters.path;
            if (target) {
                contextMemory.last_app = target;
                // Record successful command in memory
                const queryName = stepAction.parameters ? (stepAction.parameters.app || stepAction.parameters.path || target) : target;
                memoryService.recordCommand(queryName, stepAction.intent, target, true);
            }
            
            logAction(stepAction.intent, target, result.success ? 'SUCCESS' : 'FAILURE');

            if (result.success !== false) {
                Tracer.multiStep(`Step ${i+1}: ${stepAction.intent} → SUCCESS`);
                executedSteps.push({ intent: stepAction.intent, target, message: result.message });
            } else {
                Tracer.multiStep(`Step ${i+1}: ${stepAction.intent} → FAILED: ${result.message}`);
                failedSteps.push({ intent: stepAction.intent, target, error: result.message });
                finalMessage = `Execution halted: ${result.message}`;
                break; // Halt the sequence on failure
            }
        }
        
        if (failedSteps.length === 0 && executedSteps.length > 0) {
            finalMessage = executedSteps.length > 1 ? `Completed all ${executedSteps.length} steps.` : executedSteps[0].message;
        } else if (executedSteps.length === 0 && failedSteps.length === 0) {
           finalMessage = "No actionable steps found.";
        }
        
        Tracer.response(finalMessage);

        res.json({ 
            success: failedSteps.length === 0,
            message: finalMessage,
            executedSteps,
            failedSteps
        });

        Tracer.response(finalMessage);

    } catch (err) {
        logAction(action?.actions?.[0]?.intent || 'UNKNOWN', '', `FAILURE: ${err.message}`);
        Tracer.response(`Success: false | Issue: ${err.message}`);
        res.json({ success: false, message: `Issue: ${err.message}` });
    }
});

/**
 * Choice Resolution Endpoint (Phase 2)
 */
app.post('/api/execute/choice', async (req, res) => {
    const { choiceId, selectedPath, alias } = req.body;
    if (!pendingChoices.has(choiceId)) return res.status(404).json({ status: "error", message: "Choice session expired." });

    const { query, action, remainingSteps = [] } = pendingChoices.get(choiceId);
    pendingChoices.delete(choiceId);

    try {
        // 1. Save alias if provided (Learning)
        if (alias) {
            await aliasService.set(alias, selectedPath, action.intent.includes('APP') ? 'app' : 'file');
        }

        // 2. Update action parameters and execute
        action.parameters.path = selectedPath;
        if (action.parameters.app) action.parameters.app = selectedPath;
        
        const result = await dispatcher.dispatch(action);

        // 3. Record in memory
        memoryService.recordCommand(query, action.intent, selectedPath, true);

        let executedSteps = [{ intent: action.intent, message: result?.message || "Action completed with choice." }];
        let failedSteps = [];
        let finalMessage = result?.message || "Action completed with choice.";

        if (result?.success === false) {
           failedSteps.push({ intent: action.intent, error: result.message });
           return res.json({ success: false, message: `Execution failed: ${result.message}`, executedSteps, failedSteps });
        }

        // 4. Resume remaining steps
        for (let i = 0; i < remainingSteps.length; i++) {
            const step = remainingSteps[i];
            const target = step.parameters ? (step.parameters.path || step.parameters.app || step.parameters.target) : '';
            
            const stepAction = { intent: step.intent, parameters: step.parameters || {} };
            const stepResult = await dispatcher.dispatch(stepAction);

            if (stepResult && stepResult.status === 'NEED_CONFIRMATION') {
                const newActionId = Math.random().toString(36).substring(7);
                stepAction.parameters = { ...stepAction.parameters, path: stepResult.target || target };
                pendingActions.set(newActionId, { action: stepAction, sessionId: 'default', remainingSteps: remainingSteps.slice(i + 1) });
                
                return res.json({ 
                    status: "NEED_CONFIRMATION", 
                    message: `Safety Sandbox: High-risk action '${step.intent}' requires confirmation.`,
                    actionId: newActionId,
                    intent: step.intent,
                    executedSteps,
                    failedSteps
                });
            }

            if (stepResult && stepResult.status === 'NEED_CHOICE') {
                const newChoiceId = Math.random().toString(36).substring(7);
                pendingChoices.set(newChoiceId, { query: stepResult.query, alternatives: stepResult.alternatives, action: stepAction, remainingSteps: remainingSteps.slice(i + 1) });
                return res.json({
                    status: "NEED_CHOICE",
                    message: "I found multiple matches. Which one did you mean?",
                    choices: stepResult.alternatives,
                    choiceId: newChoiceId,
                    executedSteps,
                    failedSteps
                });
            }

            if (stepAction.parameters && stepAction.parameters.path) contextMemory.last_path = stepAction.parameters.path;
            if (target) {
                contextMemory.last_app = target;
                const queryName = stepAction.parameters ? (stepAction.parameters.app || stepAction.parameters.path || target) : target;
                memoryService.recordCommand(queryName, stepAction.intent, target, true);
            }
            logAction(stepAction.intent, target, stepResult.success ? 'SUCCESS' : 'FAILURE');

            if (stepResult.success !== false) {
                executedSteps.push({ intent: stepAction.intent, target, message: stepResult.message });
            } else {
                failedSteps.push({ intent: stepAction.intent, target, error: stepResult.message });
                finalMessage = `Execution halted on subsequent step: ${stepResult.message}`;
                break;
            }
        }

        if (failedSteps.length === 0 && remainingSteps.length > 0) {
            finalMessage = `Action choice applied and ${remainingSteps.length} remaining steps completed successfully.`;
        }

        res.json({ 
            success: failedSteps.length === 0, 
            message: finalMessage, 
            data: result?.data || undefined,
            executedSteps,
            failedSteps
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * Correction / Feedback Endpoint (Phase 2)
 */
app.post('/api/execute/correct', async (req, res) => {
    const { alias, correctPath, type } = req.body;
    if (!alias || !correctPath) return res.status(400).json({ status: "error", message: "Alias and CorrectPath are required." });

    try {
        await aliasService.set(alias, correctPath, type || 'file');
        res.json({ success: true, message: `Learned! I'll remember that '${alias}' means '${correctPath}' from now on.` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * Confirmation Endpoint (V38.1.4)
 */
app.post('/api/execute/confirm', async (req, res) => {
    const { actionId, confirmed } = req.body;
    if (!pendingActions.has(actionId)) return res.status(404).json({ status: "error", message: "Action expired or not found." });

    const { action, sessionId, remainingSteps = [] } = pendingActions.get(actionId);
    pendingActions.delete(actionId);

    if (!confirmed) {
        return res.json({ success: false, message: "Action aborted by user. Remaining multi-step sequence canceled." });
    }

    try {
        // Execute the confirmed action
        const result = await dispatcher.dispatch(action, true); 
        
        let executedSteps = [{ intent: action.intent, message: result?.message || "Confirmed action completed." }];
        let failedSteps = [];
        let finalMessage = result?.message || "Confirmed action completed.";

        // If it failed, abort remaining
        if (result?.success === false) {
           failedSteps.push({ intent: action.intent, error: result.message });
           return res.json({ success: false, message: `Execution failed: ${result.message}`, executedSteps, failedSteps });
        }

        // Resume remaining steps
        for (let i = 0; i < remainingSteps.length; i++) {
            const step = remainingSteps[i];
            const target = step.parameters ? (step.parameters.path || step.parameters.app || step.parameters.target) : '';
            
            // Log multi-step progress during resumption
            Tracer.multiStep(`Resuming step ${i+1}/${remainingSteps.length} (Context: Multi-step Queue)`);

            const stepAction = { intent: step.intent, parameters: step.parameters || {} };
            const stepResult = await dispatcher.dispatch(stepAction);

            if (stepResult && stepResult.status === 'NEED_CONFIRMATION') {
                const newActionId = Math.random().toString(36).substring(7);
                stepAction.parameters = { ...stepAction.parameters, path: stepResult.target || target };
                pendingActions.set(newActionId, { action: stepAction, sessionId, remainingSteps: remainingSteps.slice(i + 1) });
                
                return res.json({ 
                    status: "NEED_CONFIRMATION", 
                    message: `Safety Sandbox: High-risk action '${step.intent}' requires confirmation.`,
                    actionId: newActionId,
                    intent: step.intent,
                    executedSteps,
                    failedSteps
                });
            }

            if (stepResult && stepResult.status === 'NEED_CHOICE') {
                const choiceId = Math.random().toString(36).substring(7);
                pendingChoices.set(choiceId, { query: stepResult.query, alternatives: stepResult.alternatives, action: stepAction, remainingSteps: remainingSteps.slice(i + 1) });
                return res.json({
                    status: "NEED_CHOICE",
                    message: "I found multiple matches. Which one did you mean?",
                    choices: stepResult.alternatives,
                    choiceId,
                    executedSteps,
                    failedSteps
                });
            }

            if (stepAction.parameters && stepAction.parameters.path) contextMemory.last_path = stepAction.parameters.path;
            if (target) {
                contextMemory.last_app = target;
                const queryName = stepAction.parameters ? (stepAction.parameters.app || stepAction.parameters.path || target) : target;
                memoryService.recordCommand(queryName, stepAction.intent, target, true);
            }
            logAction(stepAction.intent, target, stepResult.success ? 'SUCCESS' : 'FAILURE');

            if (stepResult.success !== false) {
                executedSteps.push({ intent: stepAction.intent, target, message: stepResult.message });
            } else {
                failedSteps.push({ intent: stepAction.intent, target, error: stepResult.message });
                finalMessage = `Execution halted on subsequent step: ${stepResult.message}`;
                break;
            }
        }

        if (failedSteps.length === 0 && remainingSteps.length > 0) {
            finalMessage = `Confirmed action and ${remainingSteps.length} remaining steps completed successfully.`;
        }

        res.json({ 
            success: failedSteps.length === 0, 
            message: finalMessage, 
            data: result?.data || undefined,
            executedSteps,
            failedSteps
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * Get all sessions
 */
app.get('/api/sessions', async (req, res) => {
    try {
        const sessions = await Chat.aggregate([
            { $sort: { timestamp: -1 } },
            { $group: { _id: '$sessionId', lastMessage: { $first: '$user' }, timestamp: { $first: '$timestamp' } } },
            { $sort: { timestamp: -1 } },
            { $limit: 50 }
        ]);
        res.json({ status: 'success', sessions });
    } catch (err) { res.status(500).json({ status: 'error', message: err.message }); }
});

/**
 * Get full history for a session
 */
app.get('/api/chat/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const history = await Chat.find({ sessionId }).sort({ timestamp: 1 }).limit(100);
        res.json({ status: 'success', history });
    } catch (err) { res.status(500).json({ status: 'error', message: err.message }); }
});

/**
 * Delete a session
 */
app.delete('/api/chat/:sessionId', async (req, res) => {
    try {
        await Chat.deleteMany({ sessionId: req.params.sessionId });
        res.json({ status: 'success', message: 'Session deleted' });
    } catch (err) { res.status(500).json({ status: 'error', message: err.message }); }
});

/**
 * Nervous System Bridge APIs (V38.1)
 */
app.get('/system/status', (req, res) => res.json({ status: 'success', result: dispatcher.systemHub.state.get() }));
app.get('/api/system/monitor', async (req, res) => {
    try {
        const stats = await monitorService.getFullSnapshot();
        res.json({ status: 'success', result: stats });
    } catch (err) { res.status(500).json({ status: 'error', message: err.message }); }
});
app.get('/system/active-window', (req, res) => res.json({ status: 'success', result: dispatcher.systemHub.state.get('active_window') }));
app.get('/system/processes', (req, res) => res.json({ status: 'success', result: dispatcher.systemHub.state.get('running_apps') }));

app.post('/system/open-app', async (req, res) => {
    try {
        const result = await dispatcher.systemHub.execute({ intent: 'OPEN_APPLICATION', parameters: { path: req.body.path || req.body.app } });
        res.json({ status: 'success', result });
    } catch (err) { res.status(500).json({ status: 'error', message: err.message }); }
});

app.post('/system/close-app', async (req, res) => {
    try {
        const result = await dispatcher.systemHub.execute({ intent: 'CLOSE_APPLICATION', parameters: { app: req.body.app } });
        res.json({ status: 'success', result });
    } catch (err) { res.status(500).json({ status: 'error', message: err.message }); }
});

app.post('/system/focus-app', async (req, res) => {
    try {
        const result = await dispatcher.systemHub.execute({ intent: 'FOCUS_WINDOW', parameters: { app: req.body.app } });
        res.json({ status: 'success', result });
    } catch (err) { res.status(500).json({ status: 'error', message: err.message }); }
});

app.post('/system/window/arrange', async (req, res) => {
    try {
        const result = await dispatcher.systemHub.execute({ intent: 'ARRANGE_WINDOWS', parameters: { layout: req.body.layout } });
        res.json({ status: 'success', result });
    } catch (err) { res.status(500).json({ status: 'error', message: err.message }); }
});

app.post('/system/maximize', async (req, res) => {
    try {
        const result = await dispatcher.systemHub.execute({ intent: 'MAXIMIZE_WINDOW', parameters: { app: req.body.app } });
        res.json({ status: 'success', result });
    } catch (err) { res.status(500).json({ status: 'error', message: err.message }); }
});

app.post('/system/restore', async (req, res) => {
    try {
        const result = await dispatcher.systemHub.execute({ intent: 'RESTORE_WINDOW', parameters: { app: req.body.app } });
        res.json({ status: 'success', result });
    } catch (err) { res.status(500).json({ status: 'error', message: err.message }); }
});

app.post('/system/resize', async (req, res) => {
    try {
        const result = await dispatcher.systemHub.execute({ 
            intent: 'RESIZE_WINDOW', 
            parameters: { 
                app: req.body.app, 
                x: req.body.x, 
                y: req.body.y, 
                width: req.body.width, 
                height: req.body.height 
            } 
        });
        res.json({ status: 'success', result });
    } catch (err) { res.status(500).json({ status: 'error', message: err.message }); }
});

app.post('/system/volume', async (req, res) => {
    try {
        const result = await dispatcher.systemHub.execute({ intent: 'ADJUST_VOLUME', parameters: { level: req.body.level } });
        res.json({ status: 'success', result });
    } catch (err) { res.status(500).json({ status: 'error', message: err.message }); }
});

app.post('/system/brightness', async (req, res) => {
    try {
        const result = await dispatcher.systemHub.execute({ intent: 'ADJUST_BRIGHTNESS', parameters: { level: req.body.level } });
        res.json({ status: 'success', result });
    } catch (err) { res.status(500).json({ status: 'error', message: err.message }); }
});

const PORT = process.env.NODE_PORT || 5000;
// ── Sentry Error Handler (V49.1) ────────────────────────────────────────────
// The error handler must be before any other error middleware and after all controllers
Sentry.setupExpressErrorHandler(app);

// Optional: Custom error handler if needed
app.use((err, req, res, next) => {
    console.error(`[SERVER_ERROR] ${err.stack}`);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
});

app.listen(PORT, async () => {
    console.log(`EDITH Controller operational on port ${PORT}`);
    try { 
        await dispatcher.systemHub.initialize(); 
        
        // Initializing Phase 1 File Services
        indexer.startFullScan(); // Runs in background
        watcher.start();
    } 
    catch (err) { console.error('[NERVOUS SYSTEM] Failed to awaken:', err.message); }
});
