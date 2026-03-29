const { exec } = require('child_process');

/**
 * PowerShell Service (V53.3)
 * Centralized native execution engine for the EDITH Nervous System.
 */
class PowerShellService {
    async execute(script) {
        return new Promise((resolve, reject) => {
            // Encode the script to Base64 to bypass shell-level escaping/newline issues (V53.3)
            // PowerShell expects UTF-16LE encoded strings for -EncodedCommand
            const buffer = Buffer.from(script, 'utf16le');
            const encoded = buffer.toString('base64');
            
            exec(`powershell -NoProfile -NonInteractive -EncodedCommand ${encoded}`, (error, stdout, stderr) => {
                if (error) {
                    // Filter out some common non-error warnings that PS might emit to stderr
                    if (stderr && stderr.includes('Add-Type') && stderr.includes('already exists')) {
                        // This usually happens in a single session, but with EncodedCommand 
                        // it's less likely. Log it but don't crash.
                    }
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
