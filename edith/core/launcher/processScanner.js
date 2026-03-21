const powershellExecutor = require('./powershellExecutor');

/**
 * ProcessScanner (V48.1 Real-Time Awareness)
 * Specialized module for querying the Windows Process Table.
 */
class ProcessScanner {
    /**
     * Scan the OS for all user-visible running applications.
     * This is the definitive "Truth Engine" for what is open.
     */
    async scan() {
        try {
            const apps = await powershellExecutor.scanUserApps();
            return apps.map(app => ({
                name: app.Name.toLowerCase(),
                id: app.Id,
                title: app.MainWindowTitle,
                cpu: app.CPU || 0,
                memory: app.WorkingSet || 0
            }));
        } catch (e) {
            console.error('[ProcessScanner] OS Query Failed:', e.message);
            return [];
        }
    }

    /**
     * Check if a specific application is currently open.
     * @param {string} appName - The name or keyword to check.
     */
    async isRunning(appName) {
        const apps = await this.scan();
        const target = appName.toLowerCase();
        return apps.some(app => 
            app.name.includes(target) || 
            app.title.toLowerCase().includes(target)
        );
    }
}

module.exports = new ProcessScanner();
