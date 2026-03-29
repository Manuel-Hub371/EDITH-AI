/**
 * EDITH AI — Reliable Electron E2E Test Suite
 * Spawns Electron manually and connects via CDP to bypass launch failures.
 */
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

const PROJECT_ROOT = path.join(__dirname, '..');
const HOME = os.homedir();
const docs = path.join(HOME, 'Documents');
const desktop = path.join(HOME, 'Desktop');
const RESULTS = [];

async function runTests() {
    console.log('\n========================================');
    console.log('    EDITH AI — RELIABLE E2E TEST (CDP)');
    console.log('========================================\n');

    // 1. Spawn Electron manually with debugging port
    console.log('[Step 1] Spawning Electron with --remote-debugging-port=9222...');
    const electronBin = path.join(PROJECT_ROOT, 'node_modules', '.bin', 'electron.cmd');
    const child = spawn(electronBin, ['.', '--remote-debugging-port=9222'], {
        cwd: PROJECT_ROOT,
        stdio: 'ignore',
        detached: true,
        shell: true
    });
    child.unref();

    // 2. Wait for it to be ready
    let browser;
    let retries = 20;
    while (retries > 0) {
        try {
            browser = await chromium.connectOverCDP('http://localhost:9222');
            console.log('[Step 2] Connected to Electron via CDP!');
            break;
        } catch (e) {
            process.stdout.write('.');
            await new Promise(r => setTimeout(r, 1000));
            retries--;
        }
    }

    if (!browser) {
        console.error('\n[Error] Could not connect to Electron via CDP.');
        process.exit(1);
    }

    const defaultContext = browser.contexts()[0];
    const page = defaultContext.pages()[0] || await defaultContext.newPage();
    
    // 3. Wait for backend
    console.log('\n[Step 3] Waiting for backend (port 5000)...');
    const http = require('http');
    let backendRetries = 30;
    while (backendRetries > 0) {
        const ok = await new Promise(resolve => {
            const req = http.get('http://localhost:5000/api/status', res => resolve(res.statusCode === 200));
            req.on('error', () => resolve(false));
            req.setTimeout(1000, () => { req.destroy(); resolve(false); });
        });
        if (ok) { console.log('[Backend] ✅ Online'); break; }
        process.stdout.write('+');
        await new Promise(r => setTimeout(r, 2000));
        backendRetries--;
    }

    // 4. Run tests through page.evaluate (renderer context)
    async function execAction(intent, params, desc) {
        console.log(`\n>>> [${intent}] ${desc}`);
        const res = await page.evaluate(async ({ intent, params }) => {
            const action = { intent, parameters: params, mode: 'execution', message: 'e2e-test' };
            let r = await fetch('http://localhost:5000/api/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, sessionId: 'e2e-test' })
            });
            let data = await r.json();
            if (data.status === 'NEED_CONFIRMATION' && data.actionId) {
                let cr = await fetch('http://localhost:5000/api/execute/confirm', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ actionId: data.actionId, confirmed: true })
                });
                data = await cr.json();
            }
            return data;
        }, { intent, params });
        console.log(`<<< ${JSON.stringify(res)}`);
        return res;
    }

    function record(name, passed, note) {
        RESULTS.push({ name, passed, note: note || '' });
        console.log(`  [${passed ? 'PASS ✅' : 'FAIL ❌'}] ${name}`);
    }

    // --- TEST SUITE ---
    const testFolder = path.join(docs, 'TestFolder');
    const projFolder = path.join(docs, 'ProjectFolder');
    const txtFile = path.join(projFolder, 'test.txt');

    try {
        let r = await execAction('CREATE_FOLDER', { path: testFolder }, 'Create folder');
        record('File System: Create Folder', fs.existsSync(testFolder), r.message);

        r = await execAction('RENAME_FOLDER', { path: testFolder, newName: 'ProjectFolder' }, 'Rename folder');
        record('File System: Rename Folder', fs.existsSync(projFolder), r.message);

        r = await execAction('CREATE_FILE', { path: txtFile, content: 'Hello' }, 'Create file');
        record('File System: Create File', fs.existsSync(txtFile), r.message);

        r = await execAction('WRITE_FILE', { path: txtFile, content: 'Hello World' }, 'Write file');
        const c = fs.readFileSync(txtFile, 'utf8');
        record('File System: Write File', c.trim() === 'Hello World', `Content: ${c}`);

        r = await execAction('OPEN_APPLICATION', { app: 'notepad', path: 'notepad' }, 'Open Notepad');
        record('App Control: Open Notepad', r.success, r.message);
        await new Promise(r => setTimeout(r, 2000));

        r = await execAction('CLOSE_APPLICATION', { app: 'notepad' }, 'Close Notepad');
        record('App Control: Close Notepad', r.success, r.message);

        r = await execAction('ADJUST_VOLUME', { level: 50 }, 'Set Volume');
        record('System: Set Volume', r.success, r.message);

    } catch (err) {
        console.error('\n[Error During Test Execution]', err);
    }

    console.log('\n========================================');
    console.log('           FINAL REPORT                 ');
    console.log('========================================');
    for (const t of RESULTS) console.log(`  ${t.passed ? '✅' : '❌'}  ${t.name}`);
    console.log('========================================\n');

    await browser.close();
    process.exit(0);
}

runTests();
