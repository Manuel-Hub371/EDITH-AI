const powershellExecutor = require('./powershellExecutor');

/**
 * ProcessManager (Main Spawning Interface)
 * Higher-level API for EDITH to manage process lifecycles.
 */
class ProcessManager {
    /**
     * Intelligent App Launch (Phase 3 Executor)
     * Assumes path is already normalized and resolved by the unified pipeline.
     */
    async launchApp(fullPath) {
        try {
            console.log(`[ProcessManager] Launching resolved path: ${fullPath}...`);

            // OS Initiation
            const pid = await powershellExecutor.launch(fullPath);

            return {
                status: 'success',
                name: fullPath.split(/\\|\//).pop(),
                pid: pid,
                path: fullPath,
                message: `Launched (PID: ${pid})`
            };
        } catch (error) {
            console.error('[ProcessManager] Launch Error:', error.message);
            throw new Error(`Execution Failed: ${error.message}`);
        }
    }

    /**
     * Close an application by name or PID using OS-level kill
     */
    async closeApplication(target) {
        const isPid = !isNaN(parseInt(target));
        const targetClean = target.toString().replace('.exe', '');
        const script = isPid 
            ? `Stop-Process -Id ${targetClean} -Force -ErrorAction SilentlyContinue`
            : `Get-Process | Where-Object { $_.Name -like '*${targetClean}*' -or $_.MainWindowTitle -like '*${targetClean}*' } | Stop-Process -Force -ErrorAction SilentlyContinue`;

        try {
            await powershellExecutor.execute(`powershell -Command "${script}"`);
            return `Closed application: ${target}`;
        } catch (error) {
            throw new Error(`Failed to close "${target}". Ensure it is running.`);
        }
    }

    /**
     * OS Execution Verification Layer
     */
    async verifyProcess(appName) {
        const target = appName.toLowerCase().replace('.exe', '');
        const script = `Get-Process | Where-Object { $_.Name -like '*${target}*' -or $_.MainWindowTitle -like '*${target}*' } | Select-Object -First 1`;
        
        try {
            const stdout = await powershellExecutor.execute(`powershell -Command "${script}"`);
            return !!stdout.trim();
        } catch (e) {
            return false;
        }
    }

    /**
     * Legacy Compatibility Method
     */
    async launchApplication(target) {
        const result = await this.launchApp(target);
        return result.message;
    }

    /**
     * Get live list of running user apps directly from OS
     */
    async getRunningProcesses() {
        const script = `Get-Process | Where-Object { $_.MainWindowTitle } | Select-Object Name, Id, MainWindowTitle, CPU, WorkingSet | ConvertTo-Json`;
        
        try {
            const stdout = await powershellExecutor.execute(`powershell -Command "${script}"`);
            const processes = JSON.parse(stdout || '[]');
            const list = (Array.isArray(processes) ? processes : [processes]).map(p => ({
                name: p.Name,
                pid: p.Id,
                title: p.MainWindowTitle || "",
                cpu: Math.round(p.CPU || 0),
                memory: Math.round((p.WorkingSet || 0) / 1024 / 1024) // MB
            }));
            return list;
        } catch (e) {
            return [];
        }
    }

    /**
     * Alias for getRunningProcesses used by SIL Hub
     */
    async getRunningApps() {
        return await this.getRunningProcesses();
    }

    /**
     * Open a file or folder path natively
     */
    async openPath(targetPath) {
        try {
            await powershellExecutor.execute(`cmd /c start "" "${targetPath}"`);
            return `Opened path: ${targetPath}`;
        } catch (error) {
            throw new Error(`Failed to open path: ${targetPath}`);
        }
    }
}

module.exports = new ProcessManager();
