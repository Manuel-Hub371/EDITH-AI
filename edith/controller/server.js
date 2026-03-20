const express = require('express');
const axios = require('axios');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('../database/db');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Modular Imports (V38.1 Refresh)
const Utils = require('./utils');
const CommandParser = require('./command_parser');
const ActionDispatcher = require('./action_dispatcher');

dotenv.config();
connectDB();

const app = express();
const utils = new Utils();
const parser = new CommandParser();
const dispatcher = new ActionDispatcher(utils);

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
    res.json({ status: 'ok', uptime: process.uptime(), version: '39.0.0' });
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

    try {
        const historyData = await Chat.find({ sessionId }).sort({ timestamp: -1 }).limit(10);
        const history = [];
        historyData.reverse().forEach(h => {
            if (h.user) history.push({ role: "user", text: h.user });
            if (h.ai) {
                let text = typeof h.ai === 'object' ? h.ai.response : h.ai;
                if (h.ai.actions && h.ai.actions.length > 0) {
                    const actionSummaries = h.ai.actions.map(a => `[Intent: ${a.intent}]`).join(' ');
                    text = `${text} ${actionSummaries}`.trim();
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

        const aiResponse = await axios.post(`${AI_URL}/process`, { 
            message, 
            history,
            context: aiContext 
        }, { timeout: 30000, proxy: false });
        
        const aiAction = aiResponse.data;
        const chatRecord = new Chat({ sessionId, user: message, ai: aiAction });
        await chatRecord.save();

        res.json({ status: "success", action: aiAction });

    } catch (err) {
        res.status(500).json({ status: "error", message: "AI Engine Uplink Failed." });
    }
});

/**
 * Execution Pipeline (V38.1.4)
 */
const pendingActions = new Map(); // Store risky actions waiting for confirmation

app.post('/api/execute', async (req, res) => {
    const { actions, sessionId = 'default' } = req.body;
    if (!actions || !Array.isArray(actions)) return res.status(400).json({ status: "error", message: "No actions provided." });

    let finalResponse = "Task completed.";
    let allSuccess = true;

    for (const rawAction of actions) {
        try {
            const action = parser.parse(rawAction);
            const result = await dispatcher.dispatch(action);
            
            // Check for Confirmation Redirect
            if (result && result.status === "NEED_CONFIRMATION") {
                const actionId = Math.random().toString(36).substring(7);
                pendingActions.set(actionId, { action, sessionId });
                
                return res.json({ 
                    status: "NEED_CONFIRMATION", 
                    message: result.message,
                    actionId,
                    intent: action.intent
                });
            }

            if (action.path) contextMemory.last_path = action.path;
            const target = action.path || action.name || (action.parameters ? action.parameters.path || action.parameters.app || action.parameters.target : '');
            if (target) contextMemory.last_app = target;
            
            logAction(action.intent, target, 'SUCCESS');
            finalResponse = result || "Task completed.";

        } catch (err) {
            allSuccess = false;
            const target = rawAction.path || rawAction.name || (rawAction.parameters ? rawAction.parameters.path || rawAction.parameters.app || rawAction.parameters.target : '');
            logAction(rawAction.intent, target, `FAILURE: ${err.message}`);
            finalResponse = `Issue: ${err.message}`;
            break;
        }
    }
    res.json({ status: allSuccess ? "success" : "error", response: finalResponse });
});

/**
 * Confirmation Endpoint (V38.1.4)
 */
app.post('/api/execute/confirm', async (req, res) => {
    const { actionId, confirmed } = req.body;
    if (!pendingActions.has(actionId)) return res.status(404).json({ status: "error", message: "Action expired or not found." });

    const { action, sessionId } = pendingActions.get(actionId);
    pendingActions.delete(actionId);

    if (!confirmed) {
        return res.json({ status: "cancelled", message: "Action aborted by user." });
    }

    try {
        const result = await dispatcher.dispatch(action, true); // Dispatch with confirmed=true
        res.json({ status: "success", response: result || "Confirmed action completed." });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
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
app.listen(PORT, async () => {
    console.log(`EDITH Controller operational on port ${PORT}`);
    try { await dispatcher.systemHub.initialize(); } 
    catch (err) { console.error('[NERVOUS SYSTEM] Failed to awaken:', err.message); }
});
