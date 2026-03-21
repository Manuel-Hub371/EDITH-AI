const appResolver = require('./appResolver');
const powershellExecutor = require('./powershellExecutor');
const systemState = require('../../system/system_state');
const processScanner = require('./processScanner');

/**
 * ProcessManager (V48.1 Real-Time Awareness)
 * High-level orchestrator for application lifecycle and OS-level monitoring.
 */
class ProcessManager {
    constructor() {
        this.scanner = processScanner;
    }

    /**
     * Get live list of running user apps directly from OS (V48.1)
     */
    async getRunningApps() {
        const apps = await this.scanner.scan();
        systemState.update('running_apps', apps);
        return apps;
    }

    /**
     * Check if a specific application is currently open (OS Truth)
     */
    async isAppOpen(appName) {
        return await this.scanner.isRunning(appName);
    }

    /**
     * Launch an application by name or path
     */
    async launchApplication(appName) {
        try {
            // 1. Resolve path (Memory -> Auto-Discovery -> Path)
            const fullPath = await appResolver.resolve(appName);

            // 2. Launch with PowerShell
            const pid = await powershellExecutor.launch(fullPath);

            // 3. Track Process
            const processInfo = {
                pid,
                name: appName,
                path: fullPath,
                startedAt: new Date().toISOString()
            };

            this._trackProcess(processInfo);

            const type = pid === 0 ? "Modern App" : `PID: ${pid}`;
            return `Launched ${appName} (${type})`;
        } catch (error) {
            console.error(`[ProcessManager] Launch Error: ${error.message}`);
            throw new Error(`Failed to launch "${appName}". ${error.message}`);
        }
    }

    /**
     * Close an application by name or PID
     */
    async closeApplication(target) {
        try {
            const script = isNaN(parseInt(target)) 
                ? `Stop-Process -Name "${target}" -Force -ErrorAction SilentlyContinue`
                : `Stop-Process -Id ${target} -Force -ErrorAction SilentlyContinue`;

            const { execSync } = require('child_process');
            execSync(`powershell -Command "${script}"`);
            
            this._untrackProcess(target);
            return `Closed application: ${target}`;
        } catch (error) {
            throw new Error(`Failed to close "${target}". Ensure it is running.`);
        }
    }

    /**
     * Open a file or folder path
     */
    async openPath(targetPath) {
        try {
            const { execSync } = require('child_process');
            execSync(`powershell -Command "Start-Process '${targetPath}'"`);
            return `Opened path: ${targetPath}`;
        } catch (error) {
            throw new Error(`Could not open path: ${targetPath}`);
        }
    }

    /**
     * Get list of running processes with hardware metrics
     */
    async getRunningProcesses() {
        return new Promise((resolve) => {
            const { exec } = require('child_process');
            // Optimized PS command (CPU/Memory/Title)
            const script = `Get-Process | Where-Object { $_.MainWindowTitle } | Select-Object Id, ProcessName, CPU, WorkingSet, MainWindowTitle | ConvertTo-Json`;
            
            exec(`powershell -Command "${script}"`, (error, stdout) => {
                try {
                    const processes = JSON.parse(stdout || '[]');
                    const list = (Array.isArray(processes) ? processes : [processes]).map(p => ({
                        pid: p.Id,
                        name: p.ProcessName,
                        title: p.MainWindowTitle || "",
                        cpu: Math.round(p.CPU || 0),
                        memory: Math.round((p.WorkingSet || 0) / 1024 / 1024) // MB
                    }));
                    resolve(list);
                } catch (e) {
                    resolve([]);
                }
            });
        });
    }

    _trackProcess(info) {
        this.activeProcesses.push(info);
        const currentTracking = systemState.get('edith_processes') || [];
        systemState.update('edith_processes', [...currentTracking, info]);
    }

    _untrackProcess(target) {
        const isPid = !isNaN(parseInt(target));
        const filtered = this.activeProcesses.filter(p => isPid ? p.pid != target : p.name.toLowerCase() !== target.toLowerCase());
        this.activeProcesses = filtered;
        systemState.update('edith_processes', filtered);
    }
}

module.exports = new ProcessManager();
