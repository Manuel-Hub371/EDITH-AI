/**
 * System State (V38.1 Nervous System)
 * Centralized snapshot of the host OS telemetry.
 */
class SystemState {
    constructor() {
        this.cache = {
            active_window: {
                title: "",
                owner: "",
                bounds: { x: 0, y: 0, width: 0, height: 0 }
            },
            running_apps: [],
            edith_processes: [], // Track apps launched by EDITH (V38.1.2)
            telemetry: {
                cpu_load: 0,
                memory_usage: {
                    total: 0,
                    used: 0,
                    percent: 0
                },
                battery: {
                    percent: 0,
                    is_charging: false
                }
            },
            disks: [], // Disk usage telemetry
            os_info: {
                platform: "windows",
                version: "",
                hostname: "",
                uptime: 0
            },
            network: {
                status: "unknown",
                ip: ""
            },
            last_event: null,
            timestamp: Date.now()
        };
    }

    /**
     * Update specific state keys
     */
    update(key, value) {
        if (this.cache.hasOwnProperty(key)) {
            this.cache[key] = value;
            this.cache.timestamp = Date.now();
        }
    }

    /**
     * Get the full state or a specific key
     */
    get(key = null) {
        return key ? this.cache[key] : this.cache;
    }
}

// Singleton Instance
const stateInstance = new SystemState();
module.exports = stateInstance;
