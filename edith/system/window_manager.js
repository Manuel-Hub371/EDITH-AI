const psService = require('./powershell_service');
const fs = require('fs');
const path = require('path');
const systemState = require('./system_state');

/**
 * Window Manager (V47.1 Nervous System)
 * Native window orchestration via shared PowerShellService.
 */
class WindowManager {
    constructor() {
        this.logPath = path.join(__dirname, '../logs/system_integration.log');
        this.ps = psService;
    }

    _log(action, parameters, result) {
        const timestamp = new Date().toISOString();
        const entry = `[${timestamp}] OS_WINDOW | ACTION: ${action} | TARGET: ${JSON.stringify(parameters)} | RESULT: ${result}\n`;
        fs.appendFileSync(this.logPath, entry);
    }

    /**
     * Helper to wrap promises with a timeout
     */
    async _withTimeout(promise, ms, name) {
        const timeout = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`TIMEOUT: Window ${name} took > ${ms}ms`)), ms);
        });
        return Promise.race([promise, timeout]);
    }

    /**
     * Get active window info using PowerShell - Optimized (V38.1.1)
     */
    async getActiveWindow() {
        try {
            const script = `
            Add-Type -TypeDefinition "
            using System;
            using System.Runtime.InteropServices;
            public class User32 {
                [DllImport(\\"user32.dll\\")]
                public static extern IntPtr GetForegroundWindow();
                [DllImport(\\"user32.dll\\", CharSet = CharSet.Auto)]
                public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder text, int count);
            }";
            $hwnd = [User32]::GetForegroundWindow();
            $sb = New-Object System.Text.StringBuilder 256;
            [User32]::GetWindowText($hwnd, $sb, 256) | Out-Null;
            $sb.ToString();
            `;
            
            const title = await this.ps.execute(script);
            const info = { title, owner: "unknown", bounds: { x: 0, y: 0, width: 0, height: 0 } };
            systemState.update('active_window', info);
            return info;
        } catch (e) {
            return { title: "unknown" };
        }
    }

    /**
     * Internal helper to resolve window handles with retries (V38.1.6)
     */
    async _getHandle(target, retries = 4, delay = 500) {
        if (!target) return null;

        const edithApps = systemState.get('edith_processes') || [];
        const matchedApp = edithApps.find(a => a.pid == target || path.basename(a.path).toLowerCase().includes(target.toLowerCase()));
        const pid = matchedApp ? matchedApp.pid : (isNaN(parseInt(target)) ? null : parseInt(target));

        for (let i = 0; i < retries; i++) {
            const script = `
            $target = '${target}';
            $pid = '${pid || 0}';
            $apps = Get-Process | Where-Object { 
                ($_.Id -eq $pid) -or 
                ($_.ProcessName -like '*$target*') -or 
                ($_.MainWindowTitle -like '*$target*')
            } | Where-Object { $_.MainWindowHandle -ne 0 };
            
            if ($apps) { $apps[0].MainWindowHandle } else { '0' }
            `;

            const handle = await this.ps.execute(script);
            if (handle && handle !== "0") return handle;
            if (i < retries - 1) await new Promise(r => setTimeout(r, delay));
        }

        return null;
    }

    /**
     * Focus application window
     */
    async focusWindow(appName) {
        const handle = await this._getHandle(appName);
        if (!handle) throw new Error(`Window handle not found for: ${appName}`);

        const script = `
        $wshell = New-Object -ComObject WScript.Shell;
        $apps = Get-Process | Where-Object { $_.MainWindowHandle -eq ${handle} };
        if ($apps) {
            $wshell.AppActivate($apps[0].Id);
            "SUCCESS"
        } else { "NOT_FOUND" }
        `;
        
        const result = await this.ps.execute(script);
        if (result.includes("SUCCESS")) {
            this._log('focusWindow', { appName }, 'SUCCESS');
            return `Focused: ${appName}`;
        } else {
            throw new Error(`Window not found: ${appName}`);
        }
    }

    /**
     * Minimize window
     */
    async minimizeWindow(appName) {
        const handle = await this._getHandle(appName);
        if (!handle) throw new Error(`Window not found: ${appName}`);

        const script = `
        Add-Type -TypeDefinition "
        using System;
        using System.Runtime.InteropServices;
        public class User32 {
            [DllImport(\\"user32.dll\\")]
            public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
        }";
        [User32]::ShowWindow(${handle}, 6) | Out-Null; # 6 = SW_MINIMIZE
        "SUCCESS"
        `;
        await this.ps.execute(script);
        this._log('minimizeWindow', { appName }, 'SUCCESS');
        return `Minimized: ${appName}`;
    }

    /**
     * Maximize window
     */
    async maximizeWindow(appName) {
        const handle = await this._getHandle(appName);
        if (!handle) throw new Error(`Window not found: ${appName}`);

        const script = `
        Add-Type -TypeDefinition "
        using System;
        using System.Runtime.InteropServices;
        public class User32 {
            [DllImport(\\"user32.dll\\")]
            public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
        }";
        [User32]::ShowWindow(${handle}, 3) | Out-Null; # 3 = SW_MAXIMIZE
        "SUCCESS"
        `;
        await this.ps.execute(script);
        this._log('maximizeWindow', { appName }, 'SUCCESS');
        return `Maximized: ${appName}`;
    }

    /**
     * Restore window from min/max
     */
    async restoreWindow(appName) {
        const handle = await this._getHandle(appName);
        if (!handle) throw new Error(`Window not found: ${appName}`);

        const script = `
        Add-Type -TypeDefinition "
        using System;
        using System.Runtime.InteropServices;
        public class User32 {
            [DllImport(\\"user32.dll\\")]
            public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
        }";
        [User32]::ShowWindow(${handle}, 9) | Out-Null; # 9 = SW_RESTORE
        "SUCCESS"
        `;
        await this.ps.execute(script);
        this._log('restoreWindow', { appName }, 'SUCCESS');
        return `Restored: ${appName}`;
    }

    /**
     * Resize and Move window with boundary checks (V38.1.2)
     */
    async setWindowBounds(appName, x, y, width, height) {
        // 1. Get Screen Resolution for boundary check
        const screen = await this._getScreenResolution();
        const handle = await this._getHandle(appName);
        if (!handle) throw new Error(`Window not found: ${appName}`);
        
        // 2. Validate Bounds
        const finalX = Math.max(0, Math.min(x, screen.width - 100));
        const finalY = Math.max(0, Math.min(y, screen.height - 100));
        const finalW = Math.max(200, Math.min(width, screen.width - finalX));
        const finalH = Math.max(200, Math.min(height, screen.height - finalY));

        const script = `
        Add-Type -TypeDefinition "
        using System;
        using System.Runtime.InteropServices;
        public class User32 {
            [DllImport(\\"user32.dll\\")]
            public static extern bool MoveWindow(IntPtr hWnd, int x, int y, int nWidth, int nHeight, bool bRepaint);
        }";
        [User32]::MoveWindow(${handle}, ${finalX}, ${finalY}, ${finalW}, ${finalH}, $true) | Out-Null;
        "SUCCESS"
        `;
        await this.ps.execute(script);
        const params = { x: finalX, y: finalY, w: finalW, h: finalH };
        this._log('setWindowBounds', { appName, ...params }, 'SUCCESS');
        return `Moved/Resized: ${appName} to ${finalX},${finalY} (${finalW}x${finalH})`;
    }

    async _getScreenResolution() {
        const script = '[System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width; [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height';
        const stdout = await this.ps.execute(`Add-Type -AssemblyName System.Windows.Forms; ${script}`);
        const parts = stdout.trim().split(/\s+/);
        return {
            width: parseInt(parts[0]) || 1920,
            height: parseInt(parts[1]) || 1080
        };
    }

    /**
     * Arrange Workspace Layout
     */
    async arrangeWorkspace(layout) {
        if (layout === 'split-vertical') {
             await this.ps.execute("(New-Object -ComObject Shell.Application).TileVertically()");
             this._log('arrangeWorkspace', { layout }, 'SUCCESS');
             return "Arranged windows vertically.";
        }
        if (layout === 'split-horizontal') {
             await this.ps.execute("(New-Object -ComObject Shell.Application).TileHorizontally()");
             this._log('arrangeWorkspace', { layout }, 'SUCCESS');
             return "Arranged windows horizontally.";
        }
        throw new Error("Unsupported layout.");
    }
}

module.exports = new WindowManager();
