const { exec } = require('child_process');
const path = require('path');

/**
 * PowerShellExecutor (V42.0 Self-Learning Launcher)
 * Manages low-level OS interaction for application discovery and launching.
 */
class PowerShellExecutor {
    /**
     * Launch an application using the hardened launcher script
     */
    async launch(fullPath) {
        return new Promise((resolve, reject) => {
            const launcherPath = path.join(__dirname, 'launcher.ps1');
            const command = `powershell -ExecutionPolicy Bypass -File "${launcherPath}" "${fullPath}"`;
            
            exec(command, (error, stdout, stderr) => {
                if (error || stderr) {
                    const errMsg = stderr || (error ? error.message : "Unknown Launch Error");
                    return reject(new Error(errMsg.trim()));
                }
                
                const pid = parseInt(stdout.trim());
                // For UWP apps, PID may be NaN/0 from script
                resolve(isNaN(pid) ? 0 : pid);
            });
        });
    }

    /**
     * Deep search for an application executable across standard program paths
     */
    async discover(keyword) {
        return new Promise((resolve) => {
            const scriptPath = path.join(__dirname, 'discover.ps1');
            const command = `powershell -ExecutionPolicy Bypass -File "${scriptPath}" ${keyword}`;

            exec(command, (error, stdout) => {
                const foundPath = stdout ? stdout.trim() : null;
                resolve(foundPath);
            });
        });
    }

    /**
     * Fetch all user-visible running applications directly from OS (V48.1)
     */
    async scanUserApps() {
        return new Promise((resolve, reject) => {
            // Filter: Must have a MainWindowTitle to be considered a "User App"
            const script = `Get-Process | Where-Object { $_.MainWindowTitle } | Select-Object Name, Id, MainWindowTitle, @{Name='CPU';Expression={ [Math]::Round($_.CPU, 2) }}, @{Name='WorkingSet';Expression={ $_.WorkingSet64 }} | ConvertTo-Json`;
            const command = `powershell -Command "${script}"`;

            exec(command, (error, stdout, stderr) => {
                if (error) return resolve([]); // Fail gracefully with empty list
                try {
                    const data = JSON.parse(stdout);
                    resolve(Array.isArray(data) ? data : [data]);
                } catch (e) {
                    resolve([]);
                }
            });
        });
    }
}

module.exports = new PowerShellExecutor();
