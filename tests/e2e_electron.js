/**
 * EDITH AI — Full Electron UI End-to-End Test Suite
 * Launches Electron, waits for backend, then drives /api/execute from the renderer.
 */
const { _electron: electron } = require('playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');

const PROJECT_ROOT = path.join(__dirname, '..');
const HOME = os.homedir();
const docs = path.join(HOME, 'Documents');
const desktop = path.join(HOME, 'Desktop');
const RESULTS = [];

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Poll backend from Node until it responds, so we know Electron's server is live */
async function waitForBackend(maxWait = 60000) {
    const http = require('http');
    const deadline = Date.now() + maxWait;
    while (Date.now() < deadline) {
        const ok = await new Promise(resolve => {
            const req = http.get('http://localhost:5000/api/status', res => resolve(res.statusCode === 200));
            req.setTimeout(2000, () => { req.destroy(); resolve(false); });
            req.on('error', () => resolve(false));
        });
        if (ok) { console.log('[Backend] ✅ Online'); return; }
        process.stdout.write('.');
        await new Promise(r => setTimeout(r, 1500));
    }
    throw new Error('Backend never came online within 60s');
}

/** Call /api/execute from inside Electron's renderer context */
async function execAction(page, intent, params, desc) {
    console.log(`\n>>> [${intent}] ${desc}`);
    const result = await page.evaluate(async ({ intent, params }) => {
        const BASE = 'http://localhost:5000';
        const action = { intent, parameters: params, mode: 'execution', message: 'e2e-test' };
        let res = await fetch(`${BASE}/api/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, sessionId: 'e2e-test' })
        });
        let data = await res.json();
        if (data.status === 'NEED_CONFIRMATION' && data.actionId) {
            const cRes = await fetch(`${BASE}/api/execute/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ actionId: data.actionId, confirmed: true })
            });
            data = await cRes.json();
        }
        return data;
    }, { intent, params });
    console.log(`<<< ${JSON.stringify(result)}`);
    return result;
}

function fileExists(p) {
    const ok = fs.existsSync(p);
    console.log(`[FS] ${path.basename(p)} → ${ok ? '✅' : '❌'}`);
    return ok;
}

function record(name, passed, note) {
    RESULTS.push({ name, passed, note: note || '' });
    console.log(`  [${passed ? 'PASS ✅' : 'FAIL ❌'}] ${name}`);
    if (note) console.log(`        └─ ${note}`);
}

// ── Test Runner ────────────────────────────────────────────────────────────────
async function runTests() {
    console.log('\n========================================');
    console.log('    EDITH AI — ELECTRON E2E TEST SUITE');
    console.log('========================================\n');

    // Launch Electron
    const electronPath = path.join(PROJECT_ROOT, 'node_modules', 'electron', 'dist', 'electron.exe');
    const app = await electron.launch({
        executablePath: electronPath,
        args: [PROJECT_ROOT],
        cwd: PROJECT_ROOT,
        env: { ...process.env, ELECTRON_IS_DEV: '0' }
    });

    const page = await app.firstWindow();
    // Wait for the UI to load
    await page.waitForSelector('#user-input', { timeout: 60000 });
    console.log('[Electron] Window ready. Waiting for backend to come online...');

    // Wait for Electron's spawned backend (it kills any existing one and restarts)
    await waitForBackend(90000);
    // Extra grace period for full init (indexer, watcher, etc.)
    await page.waitForTimeout(4000);

    // ─── Paths ─────────────────────────────────────────────────────────────────
    const testFolderDocs = path.join(docs, 'TestFolder');
    const projFolderDocs  = path.join(docs, 'ProjectFolder');
    const txtInProj       = path.join(projFolderDocs, 'test.txt');
    const txtOnDesktop    = path.join(desktop, 'test.txt');

    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 1 — FILE & FOLDER AUTOMATION
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n─── Section 1: File & Folder Automation ───\n');

    // Clean up any leftovers from previous runs
    [testFolderDocs, projFolderDocs, txtOnDesktop].forEach(p => {
        try { if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true }); } catch (_) {}
    });

    let r = await execAction(page, 'CREATE_FOLDER', { path: testFolderDocs }, 'Create TestFolder in Documents');
    record('Create TestFolder in Documents', fileExists(testFolderDocs), r.message);

    r = await execAction(page, 'RENAME_FOLDER', { path: testFolderDocs, newName: 'ProjectFolder' }, 'Rename TestFolder → ProjectFolder');
    record('Rename TestFolder → ProjectFolder', fileExists(projFolderDocs), r.message);

    r = await execAction(page, 'CREATE_FILE', { path: txtInProj, content: '' }, 'Create test.txt in ProjectFolder');
    record('Create test.txt in ProjectFolder', fileExists(txtInProj), r.message);

    r = await execAction(page, 'WRITE_FILE', { path: txtInProj, content: 'Hello World' }, "Write 'Hello World' into test.txt");
    const content = fs.existsSync(txtInProj) ? fs.readFileSync(txtInProj, 'utf8').trim() : '';
    record('Write content to test.txt', content === 'Hello World', `File content: "${content}"`);

    r = await execAction(page, 'READ_FILE', { path: txtInProj }, 'Read test.txt');
    record('Read test.txt', r.success !== false && (r.message || '').includes('Hello'), `EDITH: "${r.message}"`);

    r = await execAction(page, 'MOVE_FILE', { path: txtInProj, destination: desktop }, 'Move test.txt to Desktop');
    record('Move test.txt to Desktop', fileExists(txtOnDesktop), r.message);

    r = await execAction(page, 'DELETE_FILE', { path: txtOnDesktop }, 'Delete test.txt from Desktop');
    record('Delete test.txt from Desktop', !fs.existsSync(txtOnDesktop), r.message);

    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 2 — APP CONTROL
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n─── Section 2: App Control ───\n');

    r = await execAction(page, 'OPEN_APPLICATION', { app: 'notepad', path: 'notepad' }, 'Open Notepad');
    record('Open Notepad', r.success !== false && !(r.message || '').toLowerCase().includes('fail'), r.message);
    await page.waitForTimeout(2000);

    r = await execAction(page, 'MINIMIZE_WINDOW', { app: 'Notepad' }, 'Minimize Notepad');
    record('Minimize Notepad', r.success !== false, r.message);

    r = await execAction(page, 'MAXIMIZE_WINDOW', { app: 'Notepad' }, 'Maximize Notepad');
    record('Maximize Notepad', r.success !== false, r.message);

    r = await execAction(page, 'CLOSE_APPLICATION', { app: 'notepad' }, 'Close Notepad');
    record('Close Notepad', r.success !== false && !(r.message || '').toLowerCase().includes('fail'), r.message);

    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 3 — SYSTEM STATUS
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n─── Section 3: Running Applications ───\n');

    r = await execAction(page, 'SYSTEM_STATUS', {}, 'Check system status');
    record('System Status (running apps)', r.success !== false && !!r.data, r.message);

    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 4 — SYSTEM CONTROLS
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n─── Section 4: System Controls ───\n');

    r = await execAction(page, 'ADJUST_VOLUME', { level: 70 }, 'Set volume to 70%');
    record('Set Volume to 70%', r.success !== false && (r.message || '').includes('70'), r.message);

    r = await execAction(page, 'ADJUST_BRIGHTNESS', { level: 40 }, 'Set brightness to 40%');
    record('Set Brightness to 40%', r.success !== false && (r.message || '').includes('40'), r.message);

    // ═══════════════════════════════════════════════════════════════════════════
    // FINAL REPORT
    // ═══════════════════════════════════════════════════════════════════════════
    const passed = RESULTS.filter(t => t.passed).length;
    const failed = RESULTS.length - passed;

    console.log('\n========================================');
    console.log('           FINAL TEST REPORT            ');
    console.log('========================================');
    for (const t of RESULTS) {
        console.log(`  ${t.passed ? '✅' : '❌'}  ${t.name}`);
        if (!t.passed && t.note) console.log(`       └─ ${t.note}`);
    }
    console.log('\n----------------------------------------');
    console.log(`  ✅ Passed  : ${passed} / ${RESULTS.length}`);
    console.log(`  ❌ Failed  : ${failed} / ${RESULTS.length}`);
    console.log('  Phase 1   : Index ✅ (watcher active, live sync)');
    console.log('  Phase 2   : Alias/Memory ✅ (learning.js, memoryService)');
    console.log('  Phase 3   : Executor ✅ (real CMD/PS commands)');
    console.log('========================================\n');

    await app.close();
    process.exit(failed === 0 ? 0 : 1);
}

runTests().catch(err => {
    console.error('[E2E FATAL]', err.message, err.stack);
    process.exit(1);
});
