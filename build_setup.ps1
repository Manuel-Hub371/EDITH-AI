# EDITH Build Automation Script
$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   EDITH Packaging & Setup Build Script   " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Paths Setup
$RootDir = Get-Location
$DistDir = Join-Path $RootDir "dist"
$BackendDir = Join-Path $RootDir "backend"
$UIDir = Join-Path $RootDir "desktop-app"
$TempDir = Join-Path $RootDir "build_temp"

# Clean previous dist/temp directories
if (Test-Path $DistDir) {
    Write-Host "Cleaning existing dist directory..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $DistDir
}
if (Test-Path $TempDir) {
    Remove-Item -Recurse -Force $TempDir
}
New-Item -ItemType Directory -Path $DistDir | Out-Null
New-Item -ItemType Directory -Path (Join-Path $DistDir "backend") | Out-Null
New-Item -ItemType Directory -Path (Join-Path $DistDir "ui") | Out-Null
New-Item -ItemType Directory -Path $TempDir | Out-Null

# 2. Build Python Backend
Write-Host "`n[1/4] Building Python Backend..." -ForegroundColor Cyan
cd $BackendDir

# Install PyInstaller if missing
Write-Host "Checking for PyInstaller..." -ForegroundColor Gray
python -c "import PyInstaller" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Installing PyInstaller..." -ForegroundColor Yellow
    pip install pyinstaller
}

# Run PyInstaller
Write-Host "Compiling edith-backend.exe..." -ForegroundColor Yellow
pyinstaller --clean EDITH_Backend.spec

$CompiledBackend = Join-Path (Join-Path $BackendDir "dist") "edith-backend.exe"
if (-not (Test-Path $CompiledBackend)) {
    throw "Failed to compile edith-backend.exe"
}

# Copy to final dist
Copy-Item $CompiledBackend (Join-Path $DistDir "backend\edith-backend.exe")
Write-Host "FastAPI Backend Compiled successfully!" -ForegroundColor Green

# 3. Fetch and Setup WinSW
Write-Host "`n[2/4] Setting up WinSW..." -ForegroundColor Cyan
$WinSWUrl = "https://github.com/winsw/winsw/releases/download/v2.12.0/WinSW-x64.exe"
$WinSWTempPath = Join-Path $TempDir "WinSW-x64.exe"

Write-Host "Downloading WinSW from $WinSWUrl..." -ForegroundColor Yellow
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Invoke-WebRequest -Uri $WinSWUrl -OutFile $WinSWTempPath

if (-not (Test-Path $WinSWTempPath)) {
    throw "Failed to download WinSW"
}

# Copy and rename to EDITHService.exe
Copy-Item $WinSWTempPath (Join-Path $DistDir "backend\EDITHService.exe")

# Copy XML configuration
Copy-Item (Join-Path $BackendDir "EDITHService.xml") (Join-Path $DistDir "backend\EDITHService.xml")
Write-Host "WinSW configured successfully!" -ForegroundColor Green

# 4. Build Electron UI
Write-Host "`n[3/4] Building Electron UI (Portable Mode)..." -ForegroundColor Cyan
cd $UIDir

Write-Host "Installing node modules..." -ForegroundColor Yellow
npm install

Write-Host "Compiling Electron App..." -ForegroundColor Yellow
npm run dist

# Find the generated portable .exe
# Portable build typically outputs as "EDITH <version>.exe" or "EDITH.exe" in desktop-app/dist/
$UIDistFolder = Join-Path $UIDir "dist"
$PortableExe = Get-ChildItem -Path $UIDistFolder -Filter "EDITH*.exe" | Where-Object { $_.Name -notmatch "Setup" } | Select-Object -First 1

if ($null -eq $PortableExe) {
    throw "Failed to find generated Electron portable executable"
}

Write-Host "Found portable UI: $($PortableExe.FullName)" -ForegroundColor Gray
Copy-Item $PortableExe.FullName (Join-Path $DistDir "ui\EDITH.exe")
Write-Host "Electron UI Compiled successfully!" -ForegroundColor Green

# 5. Clean up
Write-Host "`n[4/4] Cleaning up build artifacts..." -ForegroundColor Cyan
cd $RootDir
Remove-Item -Recurse -Force $TempDir -ErrorAction SilentlyContinue
# Clean pyinstaller build folders
Remove-Item -Recurse -Force (Join-Path $BackendDir "build") -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force (Join-Path $BackendDir "dist") -ErrorAction SilentlyContinue
# Clean electron build folder
Remove-Item -Recurse -Force (Join-Path $UIDir "dist") -ErrorAction SilentlyContinue

# 5. Compile Inno Setup installer (if iscc.exe is available)
Write-Host "`n[5/5] Compiling Inno Setup Installer..." -ForegroundColor Cyan

# Prepare the dist-installer output directory
$InstallerOutputDir = Join-Path $RootDir "dist-installer"
if (Test-Path $InstallerOutputDir) {
    Remove-Item -Recurse -Force $InstallerOutputDir -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Path $InstallerOutputDir | Out-Null

# Copy .env.example into dist\backend so the installer can bundle it
$EnvExample = Join-Path $BackendDir ".env.example"
$DistEnvExample = Join-Path $DistDir "backend\.env.example"
if (Test-Path $EnvExample) {
    Copy-Item $EnvExample $DistEnvExample -Force
    Write-Host ".env.example copied to dist/backend/" -ForegroundColor Gray
}

# Locate iscc.exe — check standard Inno Setup install paths
$IsccPaths = @(
    "C:\Program Files (x86)\Inno Setup 6\iscc.exe",
    "C:\Program Files\Inno Setup 6\iscc.exe",
    (Get-Command iscc -ErrorAction SilentlyContinue)?.Source
)
$IsccExe = $IsccPaths | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

if ($IsccExe) {
    Write-Host "Found Inno Setup compiler at: $IsccExe" -ForegroundColor Gray
    $IssFile = Join-Path $RootDir "installer\setup.iss"
    
    & $IsccExe $IssFile
    if ($LASTEXITCODE -ne 0) {
        throw "Inno Setup compilation failed. Check setup.iss for errors."
    }

    $SetupExe = Join-Path $InstallerOutputDir "EDITH-Setup.exe"
    if (Test-Path $SetupExe) {
        Write-Host "Installer compiled successfully: $SetupExe" -ForegroundColor Green
    } else {
        Write-Warning "Inno Setup ran but EDITH-Setup.exe was not found in $InstallerOutputDir"
    }
} else {
    Write-Host ""
    Write-Warning "Inno Setup (iscc.exe) not found — skipping installer compilation."
    Write-Host "  ► To compile the installer, install Inno Setup 6 from:" -ForegroundColor Yellow
    Write-Host "    https://jrsoftware.org/isinfo.php" -ForegroundColor Yellow
    Write-Host "  ► Then run manually:" -ForegroundColor Yellow
    Write-Host "    iscc `"$RootDir\installer\setup.iss`"" -ForegroundColor Yellow
}

Write-Host "`n==========================================" -ForegroundColor Green
Write-Host "EDITH Build Completed Successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "  Binaries  : $DistDir" -ForegroundColor Cyan
Write-Host "  Installer : $InstallerOutputDir\EDITH-Setup.exe" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Green
