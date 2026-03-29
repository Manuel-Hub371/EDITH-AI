const systemState = require('./system_state');
const processManager = require('../core/launcher/processManager');
const windowManager = require('./window_manager');
const systemMonitor = require('./system_monitor');
const eventListener = require('./event_listener');

const psService = require('./powershell_service');

/**
 * System Integration Hub (V47.1 Nervous System)
 * Central orchestrator for all OS-level integration and service provision.
 */
class SystemIntegrationHub {
    constructor() {
        this.state = systemState;
        this.processManager = processManager;
        this.windowManager = windowManager;
        this.monitor = systemMonitor;
        this.events = eventListener;
        this.ps = psService;
        this.isInitialized = false;
        
        // --- Rate Limiting (Unified Gateway) ---
        this.limits = {
            window: { count: 0, lastReset: Date.now(), max: 5 },
            process: { count: 0, lastReset: Date.now(), max: 3 }
        };
    }

    /**
     * Unified PowerShell Execution Engine (Passthrough V47.1)
     */
    async executePowerShell(script) {
        return this.ps.execute(script);
    }

    /**
     * Internal Rate Limiter Gate
     */
    _enforceRate(type) {
        const now = Date.now();
        const limit = this.limits[type];
        
        if (now - limit.lastReset > 1000) {
            limit.count = 0;
            limit.lastReset = now;
        }

        if (limit.count >= limit.max) {
            throw new Error(`THROTTLED: Too many ${type} actions. Max ${limit.max}/sec.`);
        }
        
        limit.count++;
    }

    /**
     * Emergency Stop: Kill all EDITH-launched processes (V38.1.4)
     */
    async emergencyStop() {
        console.log('[SIL Hub] EMERGENCY STOP INITIATED');
        const pids = this.state.get('edith_processes') || [];
        
        for (const pid of pids) {
            try {
                process.kill(pid, 'SIGKILL');
            } catch (e) {
                // Already dead or access denied
            }
        }
        
        this.state.update('edith_processes', []);
        return "All automation stopped. EDITH-launched processes terminated.";
    }

    // Helper for logging (can be toggled)
    _log(method, params, result) {
        // console.log(`[SIL Hub] ${method} called with ${JSON.stringify(params)} -> ${result}`);
    }

    /**
     * Start the Nervous System - Resilient Non-blocking (V38.1.1)
     */
    async initialize() {
        if (this.isInitialized) return;
        
        // Fire-and-forget background sync
        this._bgInitialize();
        
        this.isInitialized = true;
    }

    async _bgInitialize() {
        try {
            // Start Hearbeat and Listeners immediately
            this.monitor.start();
            this.events.start();

            // Parallel initial sync (Essential Static/Dynamic only)
            await Promise.all([
                this.monitor.refreshOsStatic().catch(() => {}),
                this.monitor.refreshState().catch(() => {}),
                this.windowManager.getActiveWindow().catch(() => {})
            ]);

            // Secondary sync (Heavier data, staggered)
            setTimeout(() => {
                this.processManager.getRunningProcesses().catch(() => {});
            }, 5000);
        } catch (err) {
            console.error('[SIL Hub] Init Error:', err.message);
        }
    }

    /**
     * Terminate the Nervous System
     */
    shutdown() {
        this.monitor.stop();
        this.isInitialized = false;
    }

    /**
     * Unified execute method for the Execution Engine (V38.1.4)
     */
    async execute(action) {
        const { intent, parameters } = action;
        const target = parameters?.path || parameters?.app || parameters?.target;
        
        if (!this.isInitialized) await this.initialize();

        switch (intent) {
            // EMERGENCY FAIL-SAFE
            case 'EMERGENCY_STOP':
                return await this.emergencyStop();

            // PROCESS & PATH (Rate Limit: 3/sec)
            case 'OPEN_APPLICATION':
                this._enforceRate('process');
                return await this.processManager.launchApplication(target);
            case 'CLOSE_APPLICATION':
                return await this.processManager.closeApplication(target);
            case 'LIST_RUNNING_APPS':
                return await this.processManager.getRunningApps();
            case 'OPEN_PATH':
                return await this.processManager.openPath(target);
            
            // WINDOW MANAGEMENT (Rate Limit: 3/sec)
            case 'FOCUS_WINDOW':
            case 'MINIMIZE_WINDOW':
            case 'MAXIMIZE_WINDOW':
            case 'RESTORE_WINDOW':
            case 'RESIZE_WINDOW':
            case 'MOVE_WINDOW':
            case 'ARRANGE_WINDOWS':
                this._enforceRate('window');
                
                if (intent === 'FOCUS_WINDOW') return await this.windowManager.focusWindow(target);
                if (intent === 'MINIMIZE_WINDOW') return await this.windowManager.minimizeWindow(target);
                if (intent === 'MAXIMIZE_WINDOW') return await this.windowManager.maximizeWindow(target);
                if (intent === 'RESTORE_WINDOW') return await this.windowManager.restoreWindow(target);
                if (intent === 'ARRANGE_WINDOWS') return await this.windowManager.arrangeWorkspace(parameters?.layout);
                
                return await this.windowManager.setWindowBounds(
                    target, 
                    parameters?.x || 0, 
                    parameters?.y || 0, 
                    parameters?.width || 800, 
                    parameters?.height || 600
                );

            // STATE ACCESS
            case 'SYSTEM_STATUS':
                return this.state.get();

            // HARDWARE CONTROL
            case 'ADJUST_VOLUME': {
                const vol = Math.min(Math.max(parameters?.level || 50, 0), 100);
                await this.executePowerShell(`(New-Object -ComObject WScript.Shell).SendKeys([char]174)*50; (New-Object -ComObject WScript.Shell).SendKeys([char]175)*${Math.floor(vol/2)}`);
                return `Volume set to ${vol}%`;
            }
            case 'ADJUST_BRIGHTNESS': {
                const bright = Math.min(Math.max(parameters?.level || 50, 0), 100);
                await this.executePowerShell(`(Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1, ${bright})`);
                return `Brightness set to ${bright}%`;
            }
            default:
                throw new Error(`Intent ${intent} not handled by SIL Hub.`);
        }
    }
}

module.exports = new SystemIntegrationHub();
