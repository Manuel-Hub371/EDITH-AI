const resolver = require('../core/pipeline/resolver');
const executorPipeline = require('../core/pipeline/executor_pipeline');
const monitorService = require('../services/monitor');
const systemHub = require('../system/index');
const appLauncher = require('../core/launcher/index');
const processManager = require('../core/launcher/processManager');
const SearchService = require('../services/search');
const Sandbox = require('../security/sandbox');

// System Trace Logging
const Tracer = require('../services/tracer');

const securityGate = new Sandbox();

/**
 * Action Dispatcher (Unified Pipeline V53.3)
 * 
 * Clean, thin router that enforces the P2 -> P1 -> P3 pipeline.
 * All complex resolution and execution is delegated to the core pipeline.
 */
class ActionDispatcher {
    constructor() {
        this.systemHub = systemHub;
    }

    async dispatch(action, confirmed = false) {
        let { intent, parameters } = action;
        
        // 0. Parameter Extraction & Normalization (V52.1)
        const target = parameters?.path || parameters?.app || parameters?.target || '';
        const secondary = parameters?.newName || parameters?.destination || parameters?.target || '';

        // Structured Logging
        console.log(`\n[ActionDispatcher] 📥 RECEIVED INTENT: ${intent}`);
        console.log(`[ActionDispatcher] 🎯 RAW TARGET: ${target || 'None'}`);
        if (secondary !== target) console.log(`[ActionDispatcher] 🔄 SECONDARY: ${secondary}`);

        // 1. Resolve Target (Phase 2 & Phase 1)
        let resolved;
        try {
            resolved = await resolver.resolve(target, intent);
        } catch (err) {
            if (intent === 'SEARCH_FILE') return await SearchService.find(target);
            
            // Standardize resolution errors into conversational responses
            const targetType = intent.includes('FOLDER') || intent.includes('PATH') ? 'folder' : 'file';
            let humanMessage = `I couldn't find that ${targetType}. Can you clarify?`;
            
            return {
                success: false,
                message: humanMessage,
                data: null
            };
        }

        // Handle Choice Prompts
        if (resolved.needsConfirmation) {
            return {
                status: 'NEED_CHOICE',
                query: target,
                alternatives: resolved.alternatives.map(a => ({ name: a.name, path: a.path, type: a.type, confidence: a.finalScore }))
            };
        }

        const finalTarget = resolved.bestMatch?.path || target;
        Tracer.resolver(`${target} -> ${finalTarget}`);

        // --- 1.6 Intent Alignment based on OS Type ---
        if (intent.startsWith('OPEN') && finalTarget) {
            try {
                const fs = require('fs');
                if (fs.existsSync(finalTarget)) {
                    const stat = fs.statSync(finalTarget);
                    if (stat.isFile() && finalTarget.toLowerCase().endsWith('.exe')) {
                        intent = 'OPEN_APPLICATION';
                        action.intent = 'OPEN_APPLICATION';
                    } else if (stat.isDirectory()) {
                        intent = 'OPEN_PATH';
                        action.intent = 'OPEN_PATH';
                    } else if (stat.isFile()) {
                        intent = 'OPEN_FILE';
                        action.intent = 'OPEN_FILE';
                    }
                }
            } catch (err) {
                // Ignore stat errors, let pipeline handle it
            }
        }

        // 1.7 Search Termination Gate
        if (intent === 'SEARCH_FILE') {
            return await SearchService.find(target);
        }

        // 1.8 Sandbox Validation Gate (Phase 3 Prep)
        if (!confirmed) {
            try {
                const riskLevel = securityGate.validate(finalTarget, intent);
                Tracer.sandbox(`Risk: ${riskLevel} | Intent: ${intent} | Target: ${finalTarget}`);
                if (riskLevel === 'HIGH') {
                    Tracer.sandbox(`BLOCKED: Requires user confirmation.`);
                    return { status: 'NEED_CONFIRMATION', intent, target: finalTarget };
                }
                Tracer.sandbox(`PASSED`);
            } catch (secErr) {
                // validate() throws if strictly Forbidden
                Tracer.sandbox(`BLOCKED: ${secErr.message}`);
                throw secErr;
            }
        } else {
            Tracer.sandbox(`PASSED (User Confirmed)`);
        }

        // 1.9 Unified Execution Routing (Phase 3)
        let executionResult;

        try {
            // A. Special Case: System Status (Non-pipeline)
            if (intent === 'SYSTEM_STATUS') {
                const snapshot = await monitorService.getFullSnapshot();
                executionResult = { success: true, message: "System status retrieved.", data: snapshot };
            } 
            // B. Special Case: Emergency Stop
            else if (intent === 'EMERGENCY_STOP') {
                const res = await systemHub.emergencyStop();
                executionResult = { success: true, message: res, data: null };
            }
            // C. Standard Pipeline Flow (Files, Apps, Windows, Hardware)
            else {
                // PATH GUARD: If no path resolved and intent requires one, abort with friendly message.
                const needsPath = !['ADJUST_VOLUME', 'ADJUST_BRIGHTNESS', 'SYSTEM_STATUS', 'EMERGENCY_STOP'].includes(intent);
                
                if (needsPath && !resolved.bestMatch?.path) {
                    // Fallback for applications that might not be in the index but are in the PATH
                    if (intent === 'OPEN_APPLICATION' || intent === 'OPEN_APP') {
                         const res = await executorPipeline.execute(action, target); // Try with raw target
                         executionResult = res;
                    } else {
                        const targetType = intent.includes('FOLDER') || intent.includes('PATH') ? 'folder' : 'file';
                        executionResult = { 
                            success: false, 
                            message: `I couldn't find that ${targetType} ("${target}"). Can you clarify?`,
                            data: { target }
                        };
                    }
                } else {
                    // Standard Execution via Pipeline
                    executionResult = await executorPipeline.execute(action, finalTarget);
                }
            }

            // 3. Format Standardized Response
            return {
                success: executionResult.success !== false,
                message: executionResult.message || "Action executed successfully.",
                data: executionResult.data || null,
                intent: intent
            };

        } catch (error) {
            console.error(`[ActionDispatcher] Pipeline Error:`, error.message);
            
            let humanMessage = `Execution failed: ${error.message}`;
            if (error.message.includes('could not be resolved')) {
                const targetType = intent.includes('FOLDER') || intent.includes('PATH') ? 'folder' : 'file';
                humanMessage = `I couldn't find that ${targetType}. Can you clarify?`;
            }

            return {
                success: false,
                message: humanMessage,
                data: null
            };
        }
    }
}

module.exports = new ActionDispatcher();
