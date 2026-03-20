const si = require('systeminformation');
const systemState = require('./system_state');
const fs = require('fs');
const path = require('path');

/**
 * System Monitor (V38.1 Nervous System)
 * Collects hardware telemetry and updates the state cache every 3 seconds.
 */
class SystemMonitor {
    constructor() {
        this.logPath = path.join(__dirname, '../logs/system_integration.log');
        this.interval = null;
    }

    _log(action, result) {
        const entry = `[${new Date().toISOString()}] MONITOR: ${action} | RESULT: ${result}\n`;
        fs.appendFileSync(this.logPath, entry);
    }

    /**
     * Start the 3-second heartbeat loop
     */
    start() {
        if (this.interval) return;
        
        this.interval = setInterval(async () => {
            await this.refreshState();
        }, 3000);
        
        this._log('Heartbeat Started', 'OK');
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            this._log('Heartbeat Stopped', 'OK');
        }
    }

    /**
     * Helper to wrap promises with a timeout
     */
    async _withTimeout(promise, ms, name) {
        const timeout = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`TIMEOUT: ${name} took > ${ms}ms`)), ms);
        });
        return Promise.race([promise, timeout]);
    }

    /**
     * Single refresh of all telemetry with timeout guards
     */
    async refreshState() {
        try {
            // Use 10s timeout for stability on slow hardware (V38.1.2)
            const syncs = [
                this._withTimeout(si.currentLoad(), 10000, 'CPU').catch(() => ({ currentLoad: 0 })),
                this._withTimeout(si.mem(), 10000, 'MEM').catch(() => ({ total: 0, used: 0, active: 0 })),
                this._withTimeout(si.battery(), 10000, 'BAT').catch(() => ({ percent: 0, isCharging: false })),
                this._withTimeout(si.networkInterfaces(), 10000, 'NET').catch(() => []),
                this._withTimeout(si.fsSize(), 10000, 'DISK').catch(() => []),
                this._withTimeout(si.time(), 5000, 'TIME').catch(() => ({ uptime: 0 }))
            ];

            const [cpu, mem, battery, network, disks, time] = await Promise.all(syncs);

            const telemetry = {
                cpu_load: Math.round(cpu.currentLoad || 0),
                memory_usage: {
                    total: Math.round((mem.total || 0) / 1024 / 1024 / 1024) || 1,
                    used: Math.round((mem.used || 0) / 1024 / 1024 / 1024),
                    percent: mem.total > 0 ? Math.round((mem.used / mem.total) * 100) : 0
                },
                battery: {
                    percent: battery.percent || 0,
                    is_charging: !!battery.isCharging
                }
            };

            const diskUsage = disks.map(d => ({
                mount: d.mount,
                size: Math.round(d.size / 1024 / 1024 / 1024),
                used: Math.round(d.used / 1024 / 1024 / 1024),
                percent: Math.round(d.use)
            }));

            const osInfo = systemState.get('os_info');
            osInfo.uptime = time.uptime;

            const defaultIface = Array.isArray(network) ? (network.find(i => i.default) || network[0]) : null;
            const netInfo = {
                status: defaultIface ? (defaultIface.operstate === 'up' ? 'online' : 'offline') : 'unknown',
                ip: defaultIface ? defaultIface.ip4 : ""
            };

            systemState.update('telemetry', telemetry);
            systemState.update('network', netInfo);
            systemState.update('disks', diskUsage);
            systemState.update('os_info', osInfo);

            return telemetry;
        } catch (error) {
            this._log('refreshState', `CRITICAL_ERROR: ${error.message}`);
            return null;
        }
    }

    async refreshOsStatic() {
        try {
            const info = await si.osInfo();
            const current = systemState.get('os_info');
            current.version = `${info.distro} ${info.release}`;
            current.hostname = info.hostname;
            systemState.update('os_info', current);
        } catch (e) {
            this._log('refreshOsStatic', `ERROR: ${e.message}`);
        }
    }
}

module.exports = new SystemMonitor();
