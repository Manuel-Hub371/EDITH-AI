; =============================================================================
;  EDITH — Enhanced Digital Intelligent Tech Helper
;  Inno Setup Script (setup.iss) — Inno Setup 6.3+ required
;
;  HOW TO COMPILE:
;    iscc "C:\Users\USER\Desktop\Manuel2995\PROJECTS\EDITH\installer\setup.iss"
;
;  OUTPUT:
;    C:\Users\USER\Desktop\Manuel2995\PROJECTS\EDITH\dist-installer\EDITH-Setup.exe
;
;  PREREQUISITES:
;    1. Inno Setup 6.3+  — https://jrsoftware.org/isinfo.php
;    2. Run build_setup.ps1 first to populate dist\ directory.
;    3. (Optional) Place a 256x256 edith.ico into installer\assets\ and
;       uncomment SetupIconFile below.
; =============================================================================

; ── Preprocessor Defines ─────────────────────────────────────────────────────
#define AppName       "EDITH"
#define AppVersion    "1.0.0"
#define AppPublisher  "Manuel2995"
#define AppURL        "https://github.com/Manuel2995"
#define AppExeName    "EDITH.exe"
#define ServiceExe    "EDITHService.exe"
#define ServiceName   "EDITH_Backend"
#define SourceBackend "..\dist\backend"
#define SourceUI      "..\dist\ui"

; =============================================================================
;  [Setup]
; =============================================================================
[Setup]
; IMPORTANT: Never change AppId across versions — used for upgrade detection
AppId={{A78C56B2-E892-491C-B7D4-F2D756314810}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL={#AppURL}
AppSupportURL={#AppURL}
AppUpdatesURL={#AppURL}
DefaultDirName={commonpf64}\{#AppName}
DefaultGroupName={#AppName}
OutputDir=..\dist-installer
OutputBaseFilename=EDITH-Setup
SetupIconFile=assets\edith.ico
; Compression — use lzma2/fast for large binaries to avoid out-of-memory
; Switch to lzma2/max or lzma2/ultra64 only if signing/CI machine has 8GB+ RAM
Compression=lzma2/fast
SolidCompression=no
; Admin required to write Program Files and manage Windows Services
PrivilegesRequired=admin
PrivilegesRequiredOverridesAllowed=dialog
; 64-bit Windows only
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
ShowLanguageDialog=no
; Detect running app before overwriting files on upgrade
CloseApplications=yes
CloseApplicationsFilter=EDITH.exe,edith-backend.exe
RestartApplications=no
; PE version info stamped into the setup exe
VersionInfoVersion={#AppVersion}
VersionInfoCompany={#AppPublisher}
VersionInfoDescription={#AppName} Setup
VersionInfoProductName={#AppName}
VersionInfoProductVersion={#AppVersion}

; =============================================================================
;  [Languages]
; =============================================================================
[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

; =============================================================================
;  [Tasks] — Optional choices shown to the user during install wizard
; =============================================================================
[Tasks]
; Desktop shortcut — unchecked by default (clean for enterprise)
Name: "desktopicon"; Description: "Create a &Desktop shortcut for EDITH"; GroupDescription: "Shortcuts:"; Flags: unchecked
; Service task — checked means backend registers as a Windows Service
Name: "installservice"; Description: "Install EDITH Backend as a Windows &Service (recommended)"; GroupDescription: "Backend:"; Flags: unchecked

; =============================================================================
;  [Files] — Files to install into {app}
; =============================================================================
[Files]
; ── Backend executable (PyInstaller compiled FastAPI server)
Source: "{#SourceBackend}\edith-backend.exe"; DestDir: "{app}\backend"; Flags: ignoreversion

; ── WinSW service wrapper (renamed from WinSW-x64.exe by build_setup.ps1)
Source: "{#SourceBackend}\{#ServiceExe}"; DestDir: "{app}\backend"; Flags: ignoreversion

; ── WinSW XML config (service id, name, executable, log settings)
Source: "{#SourceBackend}\EDITHService.xml"; DestDir: "{app}\backend"; Flags: ignoreversion

; ── .env template deployed as .env on FIRST INSTALL ONLY
; "onlyifdoesntexist" protects user API keys / DB credentials during upgrades
Source: "{#SourceBackend}\.env.example"; DestDir: "{app}\backend"; DestName: ".env"; Flags: onlyifdoesntexist

; ── Portable Electron UI (single-file — no unpacked folder needed)
Source: "{#SourceUI}\{#AppExeName}"; DestDir: "{app}\ui"; Flags: ignoreversion

; =============================================================================
;  [Icons] — Start Menu and Desktop shortcuts
; =============================================================================
[Icons]
; Start Menu — always created
Name: "{group}\{#AppName}"; Filename: "{app}\ui\{#AppExeName}"; Comment: "Launch {#AppName} AI Assistant"
; Start Menu uninstaller link
Name: "{group}\Uninstall {#AppName}"; Filename: "{uninstallexe}"
; Desktop shortcut — only if task "desktopicon" is checked
Name: "{commondesktop}\{#AppName}"; Filename: "{app}\ui\{#AppExeName}"; Comment: "Launch {#AppName} AI Assistant"; Tasks: desktopicon

; =============================================================================
;  [Run] — Commands executed AFTER files are copied
;
;  SERVICE NOTES:
;  - WorkingDir must be {app}\backend so WinSW finds EDITHService.xml
;  - runhidden + waituntilterminated = silent, blocking execution
;  - Both service entries gated by Tasks: installservice (user checkbox)
; =============================================================================
[Run]
; Step 1 — Register service with Windows SCM
Filename: "{app}\backend\{#ServiceExe}"; Parameters: "install"; WorkingDir: "{app}\backend"; StatusMsg: "Registering EDITH Backend Service..."; Flags: runhidden waituntilterminated runascurrentuser; Tasks: installservice
; Step 2 — Start the newly registered service
Filename: "{app}\backend\{#ServiceExe}"; Parameters: "start"; WorkingDir: "{app}\backend"; StatusMsg: "Starting EDITH Backend Service..."; Flags: runhidden waituntilterminated runascurrentuser; Tasks: installservice
; Step 3 — Optional: launch UI from "Setup Complete" page
; postinstall = checkbox on final wizard page
; nowait      = don't block installer exit
; skipifsilent = suppress when running /SILENT or /VERYSILENT
Filename: "{app}\ui\{#AppExeName}"; Description: "Launch {#AppName} now"; Flags: postinstall nowait skipifsilent

; =============================================================================
;  [UninstallRun] — Commands executed BEFORE files are deleted on uninstall
;
;  ORDER IS CRITICAL:
;  1. Stop  — releases file lock on edith-backend.exe so it can be deleted
;  2. Uninstall — removes service record from Windows SCM (services.msc)
;  skipifdoesntexist = safe if service was never installed
; =============================================================================
[UninstallRun]
Filename: "{app}\backend\{#ServiceExe}"; Parameters: "stop"; WorkingDir: "{app}\backend"; RunOnceId: "StopEDITHService"; Flags: runhidden waituntilterminated skipifdoesntexist
Filename: "{app}\backend\{#ServiceExe}"; Parameters: "uninstall"; WorkingDir: "{app}\backend"; RunOnceId: "UninstallEDITHService"; Flags: runhidden waituntilterminated skipifdoesntexist

; =============================================================================
;  PRODUCTION RECOMMENDATIONS
; =============================================================================
;
;  1. CODE SIGNING
;     Without a certificate, SmartScreen blocks EDITH-Setup.exe.
;     - Purchase OV/EV cert from DigiCert, Sectigo, or GlobalSign
;     - Sign all EXEs before packaging:
;         signtool sign /fd sha256 /td sha256 /tr <timestamp_url> edith-backend.exe
;         signtool sign /fd sha256 /td sha256 /tr <timestamp_url> EDITH.exe
;     - Sign the final installer:
;         signtool sign /fd sha256 /td sha256 /tr <timestamp_url> EDITH-Setup.exe
;
;  2. AUTO-UPDATES
;     - UI: Add electron-updater to desktop-app (electron-builder auto-update)
;     - Backend: Re-run installer silently: EDITH-Setup.exe /SILENT /NORESTART
;       PrepareToInstall() safely stops the service before file overwrite.
;
;  3. UPGRADE SAFETY
;     - Never change AppId GUID across releases
;     - Always increment AppVersion for each release
;     - .env uses "onlyifdoesntexist" so API keys survive upgrades
;     - PrepareToInstall() stops the service before files are overwritten
;
;  4. PRESERVING USER CONFIG
;     - Any user-edited file must use "onlyifdoesntexist" in [Files]
;     - If .env schema changes between versions, ship a migration script
;       and invoke it from [Run] post-install
;
;  5. SILENT INSTALL (CI/CD / enterprise)
;     EDITH-Setup.exe /VERYSILENT /NORESTART /TASKS="installservice,desktopicon"
;
;  6. FUTURE: MSI / GROUP POLICY
;     Inno Setup does not produce .msi files. For Group Policy deployment
;     consider WiX Toolset: https://wixtoolset.org
;
; =============================================================================
;  [Code] — Pascal scripting for advanced installer logic
; =============================================================================
[Code]

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const
  SVC_NAME = '{#ServiceName}';

// ─────────────────────────────────────────────────────────────────────────────
// ServiceExists — returns True if a named service is registered in the SCM
// Uses sc.exe query; exit code 0 = service found
// ─────────────────────────────────────────────────────────────────────────────
function ServiceExists(SvcName: string): Boolean;
var
  RC: Integer;
begin
  Exec(ExpandConstant('{sys}\sc.exe'), 'query "' + SvcName + '"',
    '', SW_HIDE, ewWaitUntilTerminated, RC);
  Result := (RC = 0);
end;

// ─────────────────────────────────────────────────────────────────────────────
// StopService — sends stop command via sc.exe; errors intentionally ignored
// (the service may already be stopped)
// ─────────────────────────────────────────────────────────────────────────────
procedure StopService(SvcName: string);
var
  RC: Integer;
begin
  Exec(ExpandConstant('{sys}\sc.exe'), 'stop "' + SvcName + '"',
    '', SW_HIDE, ewWaitUntilTerminated, RC);
end;

// ─────────────────────────────────────────────────────────────────────────────
// DeleteService — removes service registration from the SCM via sc.exe
// ─────────────────────────────────────────────────────────────────────────────
procedure DeleteService(SvcName: string);
var
  RC: Integer;
begin
  Exec(ExpandConstant('{sys}\sc.exe'), 'delete "' + SvcName + '"',
    '', SW_HIDE, ewWaitUntilTerminated, RC);
end;

// ─────────────────────────────────────────────────────────────────────────────
// InitializeSetup — pre-flight check before wizard is shown
// Blocks install on Windows versions older than 10
// ─────────────────────────────────────────────────────────────────────────────
function InitializeSetup(): Boolean;
begin
  Result := True;
  // GetWindowsVersion: $0A000000 = Windows 10.0 (build 10240+)
  if GetWindowsVersion < $0A000000 then
  begin
    MsgBox(
      'EDITH requires Windows 10 or later.' + #13#10 +
      'Please upgrade your operating system and try again.',
      mbError, MB_OK
    );
    Result := False;
  end;
end;

// ─────────────────────────────────────────────────────────────────────────────
// PrepareToInstall — runs BEFORE files are copied (fresh install or upgrade)
//
// On upgrade: if the backend service is running, we stop it here so the SCM
// releases its lock on edith-backend.exe before the [Files] section tries to
// overwrite it. Without this, the file copy silently fails on upgrade.
//
// Return '' to continue; return an error string to abort the install.
// ─────────────────────────────────────────────────────────────────────────────
function PrepareToInstall(var NeedsRestart: Boolean): String;
begin
  Result := '';
  if ServiceExists(SVC_NAME) then
  begin
    Log('PrepareToInstall: Stopping ' + SVC_NAME + ' for upgrade.');
    StopService(SVC_NAME);
    Sleep(2000); // Allow SCM 2s to fully release file handles
    Log('PrepareToInstall: Service stopped. Proceeding with file copy.');
  end;
end;

// ─────────────────────────────────────────────────────────────────────────────
// CurUninstallStepChanged — fallback service cleanup during uninstall
//
// [UninstallRun] entries are the primary mechanism. This sc.exe fallback
// handles edge cases where WinSW itself is missing or partially corrupted,
// which would cause [UninstallRun] to silently skip.
// ─────────────────────────────────────────────────────────────────────────────
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  // usUninstall fires BEFORE files are deleted — ideal for service cleanup
  if CurUninstallStep = usUninstall then
  begin
    if ServiceExists(SVC_NAME) then
    begin
      Log('CurUninstallStepChanged: Fallback sc.exe stop + delete for ' + SVC_NAME);
      StopService(SVC_NAME);
      Sleep(1500);
      DeleteService(SVC_NAME);
    end;
  end;
end;

// (end of setup.iss)
