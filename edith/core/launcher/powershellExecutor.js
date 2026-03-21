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
}

module.exports = new PowerShellExecutor();
