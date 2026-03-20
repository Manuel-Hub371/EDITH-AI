const path = require('path');
const os = require('os');

/**
 * Security Sandbox (V38.1)
 * Centralized security policy enforcement for the AI agent.
 */
class Sandbox {
    constructor() {
        // Dynamically detect system drive (usually C:)
        this.systemDrive = os.homedir().split(path.sep)[0].toLowerCase();
        
        // --- 1. Restricted Directories ---
        this.blockedFolders = [
            'windows',
            'program files',
            'program files (x86)',
            'programdata',
            'system32',
            'recovery',
            '$recycle.bin'
        ].map(p => path.join(this.systemDrive, path.sep, p).toLowerCase());

        // --- 2. Dangerous Extensions ---
        this.blockedExtensions = [
            '.bat', '.ps1', '.reg', '.vbs', '.exe', '.msi', '.cmd', '.sh', '.py', '.js'
        ];

        // --- 3. Protected System Processes ---
        this.protectedProcesses = [
            'explorer.exe', 'winlogon.exe', 'csrss.exe', 'lsass.exe', 'services.exe', 
            'svchost.exe', 'smss.exe', 'taskmgr.exe', 'wininit.exe', 'services.exe', 'lsass.exe'
        ];
    }

    /**
     * Validate process termination (V38.1.4)
     */
    validateProcess(processName) {
        if (!processName) return;
        const name = processName.toLowerCase().replace('.exe', '') + '.exe';
        if (this.protectedProcesses.includes(name)) {
            throw new Error(`SECURITY: Cannot terminate protected system process "${name}"`);
        }
    }

    /**
     * Internal path validation (V38.1.4)
     */
    validatePath(targetPath, intent = 'OPEN') {
        if (!targetPath || typeof targetPath !== 'string') return;

        const lowerPath = path.normalize(targetPath).toLowerCase();
        
        // --- System Folder Logic ---
        if (this.blockedFolders.some(f => lowerPath.startsWith(f))) {
            const isReadAction = ['OPEN', 'OPEN_PATH', 'READ_FILE', 'SUMMARIZE_FILE', 'SEARCH_FILE', 'OPEN_APPLICATION'].includes(intent);
            
            if (!isReadAction) {
                throw new Error(`SECURITY: Modification of system directory "${targetPath}" is strictly forbidden.`);
            }
        }

        // --- Extension Logic ---
        const ext = path.extname(lowerPath);
        if (this.blockedExtensions.includes(ext)) {
            const isModification = ['CREATE_FILE', 'DELETE_FILE', 'MOVE_FILE', 'MOVE_FOLDER'].includes(intent);
            if (isModification) {
                throw new Error(`SECURITY: Manipulation of "${ext}" files is blocked for safety.`);
            }
        }

        // --- Root Drive Safety ---
        const root = path.join(this.systemDrive, path.sep).toLowerCase();
        if (lowerPath === root || lowerPath === this.systemDrive.toLowerCase()) {
            if (intent !== 'OPEN_PATH') {
                throw new Error("SECURITY: Root drive manipulation is forbidden.");
            }
        }
    }

    /**
     * Global Validation Gate
     */
    validate(target, intent) {
        // 1. Path Validation
        if (target && (target.includes(path.sep) || target.includes('.') || target.includes(':'))) {
            this.validatePath(target, intent);
        }

        // 2. Process Validation (if applicable)
        if (intent === 'CLOSE_APPLICATION') {
            this.validateProcess(target);
        }

        return true;
    }
}

module.exports = Sandbox;
