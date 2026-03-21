const FileManager = require('../plugins/file_manager');
const ContentProcessor = require('../plugins/content_processor');
const systemHub = require('../system/index'); 
const Sandbox = require('../security/sandbox');
const path = require('path');

/**
 * Action Dispatcher (V38.1.5 Clean Build)
 * Centralized intent orchestration via the Nervous System Hub.
 */
class ActionDispatcher {
    constructor(utils) {
        this.utils = utils;
        this.sandbox = new Sandbox();
        
        // Initialize Core Plugins
        this.fileManager = new FileManager(utils);
        this.contentProcessor = new ContentProcessor(utils);
        this.systemHub = systemHub;
    }

    /**
     * Classified if an action requires user confirmation (V38.1.4)
     */
    _getRiskLevel(action) {
        const { intent, parameters, path: targetPath } = action;
        const target = targetPath || parameters?.app || parameters?.target || "";
        
        // 1. FORBIDDEN (Handled by Sandbox)
        try {
            this.sandbox.validate(target, intent);
        } catch (e) {
            return 'FORBIDDEN';
        }

        // 2. RISKY (Requires Confirmation)
        const riskyIntents = ['SYSTEM_SLEEP', 'LOCK_COMPUTER', 'DELETE_FOLDER', 'DELETE_FILE'];
        if (riskyIntents.includes(intent)) return 'RISKY';

        if (intent === 'CLOSE_APPLICATION') {
            const edithProcesses = this.systemHub.state.get('edith_processes') || [];
            const runningApps = this.systemHub.state.get('running_apps') || [];
            const app = runningApps.find(a => a.name.toLowerCase().includes(target.toLowerCase()));
            if (app && !edithProcesses.some(p => p.pid === app.pid)) {
                return 'RISKY';
            }
        }

        return 'NORMAL';
    }

    /**
     * Dispatches a single action to the correct sub-module.
     */
    async dispatch(action, confirmed = false) {
        const { intent, path: targetPath, name, parameters } = action;
        const target = targetPath || name || parameters?.path || parameters?.app || parameters?.target || '';
        
        // Parameter Normalization (V41.14): Ensure plugins see parameters at top level
        if (target && !action.path && !action.name) action.path = target; 
        if (parameters?.content && !action.content) action.content = parameters.content;
        if (parameters?.destination && !action.destination) action.destination = parameters.destination;
        
        // 1. Safety & Risk Gate
        const risk = this._getRiskLevel(action);
        if (risk === 'FORBIDDEN') this.sandbox.validate(target, intent);

        if (risk === 'RISKY' && !confirmed) {
            return {
                status: "NEED_CONFIRMATION",
                message: `Action "${intent}" on "${target}" requires confirmation. Proceed?`,
                action
            };
        }

        // 2. Nervous System Routing (V38.1.5)
        const silIntents = [
            'FOCUS_WINDOW', 'MINIMIZE_WINDOW', 'MAXIMIZE_WINDOW', 'RESTORE_WINDOW', 
            'RESIZE_WINDOW', 'MOVE_WINDOW', 'ARRANGE_WINDOWS', 
            'SYSTEM_STATUS', 'EMERGENCY_STOP', 'OPEN_APPLICATION', 'CLOSE_APPLICATION', 'OPEN_PATH'
        ];

        if (silIntents.includes(intent)) {
            if (!this.systemHub.isInitialized) await this.systemHub.initialize();
            return await this.systemHub.execute(action);
        }

        // 3. File & Content Plugins
        if (intent.includes('FILE') || intent.includes('FOLDER')) {
            if (['SEARCH_FILE', 'SUMMARIZE_FILE', 'READ_FILE'].includes(intent)) {
                return await this.contentProcessor.execute(action);
            }
            return await this.fileManager.execute(action);
        }

        throw new Error(`Intent ${intent} is not registered in Disptacher.`);
    }
}

module.exports = ActionDispatcher;
