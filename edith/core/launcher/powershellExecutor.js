const { exec } = require('child_process');
const path = require('path');
const Tracer = require('../../services/tracer');

/**
 * PowerShellExecutor (V50.0 Production Bridge)
 * Handles raw OS execution for discovery, launching, and process tracking.
 */
class PowerShellExecutor {
    /**
     * Tiered OS Discovery (Exact -> Fuzzy)
     * Whitelisted Locations: Program Files, Program Files (x86), LocalAppData\Programs
     */
    async discover(keyword) {
        return new Promise((resolve) => {
            // Tiered Search Script (V50.1)
            const script = `
                $keyword = "${keyword}";
                $whitelists = @(
                    "$env:ProgramFiles",
                    "\${env:ProgramFiles(x86)}",
                    "$env:LOCALAPPDATA\\Programs",
                    "$env:SystemRoot\\System32",
                    "$env:SystemRoot"
                );
                
                # Tier 1: Exact Match Search
                foreach ($p in $whitelists) {
                    if (Test-Path "$p") {
                        $match = Get-ChildItem -Path "$p" -Filter "$keyword.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
                        if ($match) { return $match.FullName }
                    }
                }

                # Tier 2: Fuzzy Match Search (Recurse whitelists only)
                $result = Get-ChildItem -Path "$whitelists" -Recurse -Include "*$keyword*.exe" -ErrorAction SilentlyContinue |
                    Where-Object { $_.Name -notmatch "uninstall|update|setup" } |
                    Select-Object -First 1 -ExpandProperty FullName
                
                return $result;
            `.trim();

            exec(`powershell -Command "${script}"`, (error, stdout) => {
                resolve(stdout ? stdout.trim() : null);
            });
        });
    }

    /**
     * Launch application and return PID using -PassThru
     */
    async launch(fullPath) {
        return new Promise((resolve, reject) => {
            // Detect if target is a URI Protocol (e.g. ms-settings:)
            const isUri = fullPath.includes(':') && !fullPath.includes('\\') && !fullPath.includes('/');
            
            // For URIs, we cannot use -PassThru easily to get a PID.
            // We use a simplified Start-Process and resolve with 0.
            const command = isUri 
                ? `powershell -Command "Start-Process '${fullPath}' -ErrorAction Stop"`
                : `powershell -Command "(Start-Process -FilePath '${fullPath}' -PassThru -ErrorAction Stop).Id"`;
            
            Tracer.executor(`Tool: PowerShell | Mode: Launch | Command: ${command.substring(0, 150)}`);

            exec(command, (error, stdout, stderr) => {
                if (error || stderr) {
                    Tracer.executor(`FAILED: ${stderr || (error ? error.message : "OS_LAUNCH_FAULT")}`);
                    return reject(new Error(stderr || (error ? error.message : "OS_LAUNCH_FAULT")));
                }
                const pid = parseInt(stdout.trim());
                Tracer.executor(`SUCCESS: process launched -> PID ${pid}`);
                resolve(isNaN(pid) ? 0 : pid);
            });
        });
    }

    /**
     * Generic OS Execution (V50.2)
     */
    async execute(command) {
        return new Promise((resolve, reject) => {
            Tracer.executor(`Tool: CMD/PowerShell | Executing: ${command.substring(0, 150)}...`);
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    Tracer.executor(`FAILED: ${stderr || error.message}`);
                    return reject(new Error(stderr || error.message));
                }
                Tracer.executor(`SUCCESS: ${stdout ? stdout.trim().substring(0, 200) : "No output"}`);
                resolve(stdout ? stdout.trim() : "");
            });
        });
    }
}

module.exports = new PowerShellExecutor();
