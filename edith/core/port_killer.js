const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * PortKiller (V50.0.1)
 * Automatically terminates processes on configured Node and Python ports
 * to prevent EADDRINUSE errors during development/startup.
 */

// Load .env manually to find ports
const envPath = path.join(__dirname, '../../.env');
let nodePort = 5000;
let pythonPort = 8000;

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const nodeMatch = envContent.match(/^NODE_PORT=(\d+)/m);
    const pythonMatch = envContent.match(/^PYTHON_PORT=(\d+)/m);
    if (nodeMatch) nodePort = parseInt(nodeMatch[1]);
    if (pythonMatch) pythonPort = parseInt(pythonMatch[1]);
}

const ports = [nodePort, pythonPort];

console.log(`[PortKiller] Auditing ports: ${ports.join(', ')}...`);

ports.forEach(port => {
    try {
        // PowerShell command: Find the process ID owning the port and terminate it forcefully
        const script = `Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }`;
        execSync(`powershell -Command "${script}"`, { stdio: 'inherit' });
    } catch (e) {
        // Process might not exist or already be closed
    }
});

console.log(`[PortKiller] Ports cleared. Ready for startup.`);
