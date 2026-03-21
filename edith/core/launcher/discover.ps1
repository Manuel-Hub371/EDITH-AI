$searchPaths = @(
    $env:ProgramFiles,
    ${env:ProgramFiles(x86)},
    "$env:LOCALAPPDATA\Programs",
    $env:WinDir,
    "$env:WinDir\System32"
);
$keyword = $args[0];
$result = $null;

# Helper to find a sibling .exe if the result is a script
function Resolve-SiblingExe($scriptPath) {
    if ($scriptPath -match '\.cmd$|\.bat$') {
        $parent = Split-Path -Parent $scriptPath
        $name = [System.IO.Path]::GetFileNameWithoutExtension($scriptPath)
        
        # 1. Try exact name .exe in same folder
        $sibling = Get-ChildItem -Path $parent -Filter "$name.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($sibling) { return $sibling.FullName }
        
        # 2. Try common bin-to-app-root resolution (e.g. VS Code bin/code.cmd -> Code.exe)
        $grandparent = Split-Path -Parent $parent
        $rootSibling = Get-ChildItem -Path $grandparent -Filter "*.exe" -ErrorAction SilentlyContinue | 
            Where-Object { $_.Name -notmatch "unins|setup|update" } | Select-Object -First 1
        if ($rootSibling) { return $rootSibling.FullName }
    }
    return $null
}

# 1. Try Exact Match in base paths (Fastest)
foreach ($p in $searchPaths) {
    if (Test-Path $p) {
        $match = Get-ChildItem -Path $p -Filter "$keyword.*" -Include "*.exe","*.lnk","*.cmd","*.bat" -ErrorAction SilentlyContinue | Select-Object -First 1;
        if ($match) { 
            $res = Resolve-SiblingExe $match.FullName
            $result = if ($res) { $res } else { $match.FullName }
            if ($result) { break; }
        }
    }
}

# 2. Try Get-Command (System PATH discovery)
if (-not $result) {
    try {
        $cmd = Get-Command $keyword -ErrorAction SilentlyContinue;
        if ($cmd -and ($cmd.Extension -eq ".exe" -or $cmd.CommandType -eq "Application")) { 
            $result = $cmd.Source; 
        } elseif ($cmd -and ($cmd.Extension -match '\.cmd$|\.bat$')) {
            $res = Resolve-SiblingExe $cmd.Source
            if ($res) { $result = $res }
        }
    } catch { }
}

# 3. Recursive Search (Fuzzy) in Programs (Deep fallback)
if (-not $result -and $keyword.Length -gt 2) {
    $security = Get-Content (Join-Path $PSScriptRoot "security.json") | ConvertFrom-Json
    $deepPaths = @($env:ProgramFiles, ${env:ProgramFiles(x86)}, "$env:LOCALAPPDATA\Programs");
    # Search for exe, lnk, and potentially scripts to resolve
    $match = Get-ChildItem -Path $deepPaths -Recurse -Include "*$keyword*.exe","*$keyword*.lnk","*$keyword*.cmd","*$keyword*.bat" -ErrorAction SilentlyContinue | 
        Where-Object { 
            $_.FullName -notmatch "uninstall|update|setup|crash|helper" -and
            $_.Extension -notin $security.blocklist
        } | 
        Select-Object -First 1;
    
    if ($match) {
        $res = Resolve-SiblingExe $match.FullName
        $result = if ($res) { $res } else { $match.FullName }
    }
}

# 4. Fast UWP/Start Menu Discovery (Modern Apps V46.3)
if (-not $result) {
    try {
        # Get-StartApps is MUCH faster than COM iteration
        $startMatch = Get-StartApps | Where-Object { $_.Name -like "*$keyword*" -or $_.AppID -like "*$keyword*" } | Select-Object -First 1
        if ($startMatch) {
            # Check if it's already a path (some classic apps show up here too)
            if (Test-Path $startMatch.AppID) {
                $result = $startMatch.AppID
            } else {
                # Return as UWP AppID
                $result = "uwp:$($startMatch.AppID)"
            }
        }
    } catch { }
}

# Final Security Filter (Block script output if unresolved)
if ($result -match '\.cmd$|\.bat$|\.ps1$|\.vbs$') {
    $result = $null
}

$result;
