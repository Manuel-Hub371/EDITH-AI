const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const systemState = require('./system_state');
const Utils = require('../controller/utils');

/**
 * Process Manager (V38.1.5 Nervous System)
 * High-level orchestration for process detection and safe termination.
 */
class ProcessManager {
    constructor() {
        this.logPath = path.join(__dirname, '../logs/system_integration.log');
        this.registryPath = path.join(__dirname, '../config/app_registry.json');
        this.utils = new Utils();
    }

    _log(action, parameters, result) {
        const timestamp = new Date().toISOString();
        const entry = `[${timestamp}] OS_PROCESS | ACTION: ${action} | TARGET: ${JSON.stringify(parameters)} | RESULT: ${result}\n`;
        fs.appendFileSync(this.logPath, entry);
    }

    /**
     * Get list of running processes - Robust PowerShell (V38.1.2)
     */
    async getRunningProcesses() {
        return new Promise((resolve) => {
            // Optimized PS command to get real apps with window titles where possible
            const command = 'powershell -Command "Get-Process | Where-Object { $_.MainWindowTitle -or $_.Id } | Select-Object Id, ProcessName, CPU, WorkingSet, MainWindowTitle | ConvertTo-Json"';
            exec(command, (error, stdout) => {
                try {
                    const processes = JSON.parse(stdout || '[]');
                    const list = (Array.isArray(processes) ? processes : [processes]).map(p => ({
                        pid: p.Id,
                        name: p.ProcessName,
                        title: p.MainWindowTitle || "",
                        cpu: Math.round(p.CPU || 0),
                        memory: Math.round((p.WorkingSet || 0) / 1024 / 1024) // MB
                    }));
                    systemState.update('running_apps', list);
                    resolve(list);
                } catch (err) {
                    this._log('getRunningProcesses', {}, `ERROR: ${err.message}`);
                    resolve([]);
                }
            });
        });
    }

    /**
     * Launch application safely and track PID (V38.1.2)
     */
    async launchApplication(inputPath) {
        return new Promise((resolve, reject) => {
            let actualPath = inputPath;
            
            // 1. Registry Lookup (V38.1.5)
            if (!inputPath.includes('\\') && !inputPath.includes('/')) {
                try {
                    if (fs.existsSync(this.registryPath)) {
                        const registry = JSON.parse(fs.readFileSync(this.registryPath, 'utf8'));
                        if (registry[inputPath.toLowerCase()]) {
                            actualPath = this.utils.getSafePath(registry[inputPath.toLowerCase()]);
                        }
                    }
                } catch (e) { /* ignore */ }
            }

            // 2. Launch using PowerShell to capture the new PID
            // Start-Process returns the process object which we pipe to Select-Object Id
            const command = `powershell -Command "(Start-Process -FilePath '${actualPath}' -PassThru).Id"`;
            
            exec(command, (error, stdout) => {
                if (error) {
                    this._log('launchApplication', { inputPath }, `FAILURE: ${error.message}`);
                    return reject(new Error(`Could not launch "${inputPath}". Check path or registry.`));
                }

                const pid = parseInt(stdout.trim());
                if (!isNaN(pid)) {
                    const launched = systemState.get('edith_processes');
                    launched.push({ pid, path: actualPath, time: Date.now() });
                    systemState.update('edith_processes', launched);
                    
                    this._log('launchApplication', { inputPath, pid }, 'SUCCESS');
                    resolve(`Launched: ${path.basename(actualPath)} (PID: ${pid})`);
                } else {
                    this._log('launchApplication', { inputPath }, 'SUCCESS (PID unknown)');
                    resolve(`Launched: ${path.basename(actualPath)}`);
                }
            });
        });
    }

    /**
     * Close application gracefully (V38.1.2)
     */
    async closeApplication(processName) {
        const name = processName.toLowerCase();
        
        // Safety: Validated by ActionDispatcher + Sandbox before arrival here (V38.1.4)

        return new Promise((resolve, reject) => {
            // Determine if input is PID or name
            const isPid = !isNaN(parseInt(processName));
            const filter = isPid ? `/PID ${processName}` : `/IM "${processName}"`;
            
            // Use taskkill without /F (no forceful kill)
            const cmd = `taskkill ${filter}`;
            exec(cmd, (error) => {
                if (error) {
                    // Taskkill fails if process isn't there, we log it
                    this._log('closeApplication', { processName }, `FAILURE: ${error.message}`);
                    return reject(new Error(`Exit request failed for ${processName}. It may already be closed.`));
                }
                this._log('closeApplication', { processName }, 'SUCCESS');
                resolve(`Close signal sent to: ${processName}`);
            });
        });
    }

    async getProcessByName(name) {
        const list = await this.getRunningProcesses();
        return list.find(p => p.name.toLowerCase().includes(name.toLowerCase()));
    }

    /**
     * Open a file or folder in its default handler (V38.1.5)
     */
    async openPath(targetPath) {
        return new Promise((resolve, reject) => {
            const command = `start "" "${targetPath}"`;
            exec(command, (error) => {
                if (error) {
                    this._log('openPath', { targetPath }, `FAILURE: ${error.message}`);
                    return reject(new Error(`Could not open path "${targetPath}".`));
                }
                this._log('openPath', { targetPath }, 'SUCCESS');
                resolve(`Opened: ${targetPath}`);
            });
        });
    }
}

module.exports = new ProcessManager();
