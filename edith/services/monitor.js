const si = require('systeminformation');

/**
 * Monitor Service (v1.0)
 * 
 * Provides real-time system telemetry (CPU, RAM, Battery, Network).
 * Used for "How much RAM am I using?" or "What's the CPU load?".
 */
class MonitorService {
    /**
     * Get a comprehensive snapshot of system health
     */
    async getFullSnapshot() {
        try {
            const [cpu, mem, battery, graphics, os] = await Promise.all([
                si.currentLoad(),
                si.mem(),
                si.battery(),
                si.graphics(),
                si.osInfo()
            ]);

            return {
                cpu: {
                    load: Math.round(cpu.currentLoad),
                    cores: cpu.cpus.length
                },
                memory: {
                    total: (mem.total / (1024 ** 3)).toFixed(2) + 'GB',
                    used: (mem.used / (1024 ** 3)).toFixed(2) + 'GB',
                    percent: Math.round((mem.used / mem.total) * 100)
                },
                battery: {
                    percent: battery.percent,
                    isCharging: battery.isCharging,
                    hasBattery: battery.hasBattery
                },
                gpu: graphics.controllers.map(g => g.model).join(', '),
                os: `${os.distro} ${os.release}`
            };
        } catch (err) {
            console.error('[MonitorService] Snapshot Error:', err.message);
            return null;
        }
    }

    /**
     * Get specific dynamic metrics (faster)
     */
    async getDynamicStats() {
        const cpu = await si.currentLoad();
        const mem = await si.mem();
        return {
            cpu: Math.round(cpu.currentLoad),
            ram: Math.round((mem.active / mem.total) * 100)
        };
    }
}

module.exports = new MonitorService();
