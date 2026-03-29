const { exec } = require('child_process');
const Sentry = require('@sentry/node');
const path = require('path');
const fs = require('fs');

/**
 * Executor Service (v1.0)
 * 
 * Centralized engine for OS-level command execution (CMD/PowerShell).
 * Optimized for safety, logging, and error tracing.
 */
class ExecutorService {
    constructor() {
        this.logPath = path.join(__dirname, '../logs/execution.log');
    }

    /**
     * Execute a regular CMD command
     */
    async executeCMD(command) {
        return new Promise((resolve, reject) => {
            console.log(`[Executor] CMD: ${command}`);
            exec(command, (error, stdout, stderr) => {
                this.logResult('CMD', command, !error);
                if (error) {
                    Sentry.captureException(error);
                    return reject(new Error(stderr || error.message));
                }
                resolve(stdout.trim());
            });
        });
    }

    /**
     * Execute a PowerShell command
     */
    async executePS(command) {
        const psCommand = `powershell -NoProfile -ExecutionPolicy Bypass -Command "${command.replace(/"/g, '\"')}"`;
        return new Promise((resolve, reject) => {
            console.log(`[Executor] PS: ${command}`);
            exec(psCommand, (error, stdout, stderr) => {
                this.logResult('PS', command, !error);
                if (error) {
                    Sentry.captureException(error);
                    return reject(new Error(stderr || error.message));
                }
                resolve(stdout.trim());
            });
        });
    }

    /**
     * Log execution to local disk
     */
    logResult(type, command, success) {
        try {
            const timestamp = new Date().toISOString();
            const entry = `[${timestamp}] [${type}] [${success ? 'SUCCESS' : 'FAILURE'}] ${command}\n`;
            if (!fs.existsSync(path.dirname(this.logPath))) {
                fs.mkdirSync(path.dirname(this.logPath), { recursive: true });
            }
            fs.appendFileSync(this.logPath, entry);
        } catch (err) {
            console.error('[Executor] Logging failed:', err.message);
        }
    }
}

module.exports = new ExecutorService();
