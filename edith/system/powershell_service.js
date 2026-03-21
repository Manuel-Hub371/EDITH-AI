const { exec } = require('child_process');

/**
 * PowerShell Service (V47.1)
 * Centralized native execution engine for the EDITH Nervous System.
 */
class PowerShellService {
    async execute(script) {
        return new Promise((resolve, reject) => {
            // Remove line breaks and normalize whitespace for safe shell execution
            const cleanScript = script.replace(/\n\s+/g, ' ').trim();
            
            exec(`powershell -Command "${cleanScript}"`, (error, stdout, stderr) => {
                if (error) {
                    return reject(new Error(stderr || error.message));
                }
                resolve(stdout ? stdout.trim() : "");
            });
        });
    }

    /**
     * Specialized: Execute a multi-line script using a temporary file if needed
     * (Currently handled by cleaning the string for most EDITH tasks)
     */
    async executeBatch(script) {
        return this.execute(script);
    }
}

module.exports = new PowerShellService();
