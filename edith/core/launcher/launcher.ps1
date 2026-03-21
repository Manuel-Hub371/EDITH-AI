param([string]$targetPath)

$security = Get-Content (Join-Path $PSScriptRoot "security.json") | ConvertFrom-Json
$blocklist = $security.blocklist
$ext = [System.IO.Path]::GetExtension($targetPath).ToLower()

# 1. UWP / Protocol Launch Logic (V46.0)
if ($targetPath.StartsWith("uwp:")) {
    $aumid = $targetPath.Substring(4)
    # Start UWP app via explorer shell:AppsFolder (Fastest/Reliable)
    Start-Process "explorer.exe" -ArgumentList "shell:AppsFolder\$aumid"
    # UWP apps don't reliably return a PID through Start-Process URI
    exit 0 
}

if ($targetPath -match '^[a-z0-9\-]+\:') {
    # Protocol Launch (ms-settings:, calculator:, etc.)
    Start-Process "$targetPath"
    exit 0
}

# 2. Shortcut Resolution (V44.0)
if ($ext -eq '.lnk') {
    try {
        $sh = New-Object -ComObject WScript.Shell
        $targetPath = $sh.CreateShortcut($targetPath).TargetPath
        $ext = [System.IO.Path]::GetExtension($targetPath).ToLower()
    } catch {
        Write-Error "LNK_RESOLVE_ERROR: Could not resolve shortcut target."
        exit 1
    }
}

# 3. Security Guard (Post-resolution)
if ($blocklist -contains $ext) {
    Write-Error "SECURITY_ERROR: Execution of $ext files is forbidden for safety."
    exit 1
}

if (-not (Test-Path $targetPath)) {
    Write-Error "PATH_NOT_FOUND: The system cannot find the path specified: $targetPath"
    exit 1
}

try {
    # 4. Native Execution (.exe only after resolution)
    $proc = Start-Process -FilePath "$targetPath" -PassThru -ErrorAction Stop
    if ($proc) {
        $proc.Id
    } else {
        Write-Error "LAUNCH_FAILED: Process could not be initialized."
        exit 1
    }
} catch {
    Write-Error "EXECUTION_ERROR: $($_.Exception.Message)"
    exit 1
}
