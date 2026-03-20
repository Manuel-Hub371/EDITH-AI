const EventEmitter = require('events');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const systemState = require('./system_state');

/**
 * Event Listener (V38.1 Nervous System)
 * Watches for OS events and emits them to the internal bus.
 */
class SystemEventListener extends EventEmitter {
    constructor() {
        super();
        this.logPath = path.join(__dirname, '../logs/system_integration.log');
    }

    _log(event, metadata) {
        const entry = `[${new Date().toISOString()}] EVENT: ${event} | DATA: ${JSON.stringify(metadata)}\n`;
        fs.appendFileSync(this.logPath, entry);
    }

    /**
     * Start watchers for important events (V38.1.2)
     */
    start() {
        this._watchNetwork();
        this._watchDownloads();
        this._watchProcesses();
        this._watchUSB();
        this._log('Listeners Started', 'OK');
    }

    /**
     * Monitor Process Start/Stop via WMI
     * This is ultra-lightweight (0.1% CPU)
     */
    _watchProcesses() {
        const script = `
        $queryStart = "SELECT * FROM __InstanceCreationEvent WITHIN 2 WHERE TargetInstance ISA 'Win32_Process'";
        $queryStop = "SELECT * FROM __InstanceDeletionEvent WITHIN 2 WHERE TargetInstance ISA 'Win32_Process'";
        
        Write-Host "STARTING_WATCHERS";
        
        Register-CimIndicationEvent -Query $queryStart -SourceIdentifier "ProcStart";
        Register-CimIndicationEvent -Query $queryStop -SourceIdentifier "ProcStop";
        
        while ($true) {
            $event = Get-Event -ErrorAction SilentlyContinue;
            if ($event) {
                $type = if ($event.SourceIdentifier -eq "ProcStart") { "START" } else { "STOP" };
                $name = $event.SourceEventArgs.NewEvent.TargetInstance.Name;
                Write-Host "EVENT:$type:$name";
                Remove-Event $event.SourceIdentifier;
            }
            Start-Sleep -Seconds 1;
        }
        `;

        const ps = exec(`powershell -Command "${script.replace(/\n/g, ' ')}"`);
        
        ps.stdout.on('data', (data) => {
            const lines = data.toString().split('\n');
            for (const line of lines) {
                if (line.startsWith('EVENT:')) {
                    const parts = line.trim().split(':');
                    if (parts.length >= 3) {
                        const type = parts[1];
                        const name = parts[2];
                        this.emit(type === 'START' ? 'PROCESS_STARTED' : 'PROCESS_STOPPED', { name });
                        this._log(type === 'START' ? 'PROCESS_STARTED' : 'PROCESS_STOPPED', { name });
                    }
                }
            }
        });
    }

    /**
     * Monitor USB/Hardware Changes
     */
    _watchUSB() {
        const script = `
        $query = "SELECT * FROM Win32_DeviceChangeEvent WHERE EventType = 2 OR EventType = 3";
        Register-CimIndicationEvent -Query $query -SourceIdentifier "USBEvent";
        while ($true) {
            $event = Get-Event -ErrorAction SilentlyContinue;
            if ($event) {
                Write-Host "EVENT:USB_CHANGE";
                Remove-Event USBEvent;
            }
            Start-Sleep -Seconds 2;
        }
        `;
        const ps = exec(`powershell -Command "${script.replace(/\n/g, ' ')}"`);
        ps.stdout.on('data', (data) => {
            if (data.includes('EVENT:USB_CHANGE')) {
                this.emit('HARDWARE_CHANGE', { type: 'USB' });
                this._log('HARDWARE_CHANGE', { type: 'USB' });
            }
        });
    }

    /**
     * Monitor Network Changes
     */
    _watchNetwork() {
        let lastStatus = systemState.get('network').status;
        
        setInterval(() => {
            const currentStatus = systemState.get('network').status;
            if (currentStatus !== lastStatus) {
                this.emit('NETWORK_CHANGED', { from: lastStatus, to: currentStatus });
                this._log('NETWORK_CHANGED', { from: lastStatus, to: currentStatus });
                lastStatus = currentStatus;
            }
        }, 5000);
    }

    /**
     * Monitor Downloads Folder
     */
    _watchDownloads() {
        const downloadsPath = path.join(process.env.USERPROFILE, 'Downloads');
        if (!fs.existsSync(downloadsPath)) return;

        fs.watch(downloadsPath, (eventType, filename) => {
            if (eventType === 'rename' && filename) {
                const fullPath = path.join(downloadsPath, filename);
                setTimeout(() => {
                    if (fs.existsSync(fullPath)) {
                        this.emit('FILE_DOWNLOADED', { filename, path: fullPath });
                        this._log('FILE_DOWNLOADED', { filename });
                    }
                }, 1000); // Debounce
            }
        });
    }

    notify(event, data) {
        this.emit(event, data);
        this._log(event, data);
        systemState.update('last_event', { event, data, time: Date.now() });
    }
}

module.exports = new SystemEventListener();
