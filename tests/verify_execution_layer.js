const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');

const API_URL = 'http://localhost:5000/api/execute';

async function runTest(desc, intent, params) {
    console.log(`\n[TEST] ${desc} (${intent})...`);
    try {
        const payload = { action: { intent, parameters: params, mode: 'execution', message: 'test' }, sessionId: 'verify' };
        let response = await axios.post(API_URL, payload);
        let result = response.data;
        
        if (result.status === 'NEED_CONFIRMATION' && result.actionId) {
            console.log(`   [CONFIRMATION] Auto-confirming ${result.actionId}...`);
            const cres = await axios.post(`${API_URL}/confirm`, { actionId: result.actionId, confirmed: true });
            result = cres.data;
        }

        console.log(`[RESPONSE] Success: ${result.success}`);
        console.log(`[RESPONSE] Message: ${result.message}`);
        
        if (result.success === undefined || result.message === undefined) {
            console.error('FAIL: Missing standard response fields!');
            return false;
        }

        return result.success;
    } catch (error) {
        console.error(`ERROR: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
        return false;
    }
}

async function startVerification() {
    console.log('========================================');
    console.log('    EDITH AI — EXECUTION LAYER VERIFY   ');
    console.log('========================================');

    const HOME = os.homedir();
    const docs = path.join(HOME, 'Documents');
    const testFolder = path.join(docs, 'ExecutionTestFolder');
    const movedFolder = path.join(HOME, 'Desktop', 'ExecutionTestFolder');

    // 1. App Control & Hardware
    await runTest('Hardware: Adjust volume to 40%', 'ADJUST_VOLUME', { level: 40 });
    // await runTest('Hardware: Set brightness to 70%', 'ADJUST_BRIGHTNESS', { level: 70 });

    // Open an app so we can test windowing
    await runTest('App: Open Notepad', 'OPEN_APPLICATION', { target: 'notepad.exe' });
    await new Promise(r => setTimeout(r, 2000));
    await runTest('App: Minimize Notepad', 'MINIMIZE_WINDOW', { target: 'Notepad' });
    await new Promise(r => setTimeout(r, 1000));
    await runTest('App: Maximize Notepad', 'MAXIMIZE_WINDOW', { target: 'Notepad' });
    await new Promise(r => setTimeout(r, 1000));
    await runTest('App: Close Notepad', 'CLOSE_APPLICATION', { target: 'Notepad' });

    // 2. File Operations (Phase 3 Sync)
    console.log(`\n[Phase 1/3] Testing File Ops in ${testFolder}...`);
    
    // Ensure we start clean
    if (fs.existsSync(testFolder)) fs.rmSync(testFolder, { recursive: true, force: true });
    if (fs.existsSync(movedFolder)) fs.rmSync(movedFolder, { recursive: true, force: true });

    await runTest('File: Create Folder', 'CREATE_FOLDER', { path: testFolder });
    await new Promise(r => setTimeout(r, 1000));

    if (fs.existsSync(testFolder)) {
        await runTest('File: Create File', 'CREATE_FILE', { path: path.join(testFolder, 'test.txt') });
        await runTest('File: Write to File', 'WRITE_FILE', { path: path.join(testFolder, 'test.txt'), content: "Refactor Passed" });
        await runTest('File: Read File', 'READ_FILE', { path: path.join(testFolder, 'test.txt') });
        
        await runTest('File: Rename Folder', 'RENAME_FOLDER', { path: testFolder, newName: 'StableFolder' });
        const renamedFolder = path.join(docs, 'StableFolder');
        await new Promise(r => setTimeout(r, 1000));

        if (fs.existsSync(renamedFolder)) {
            console.log('PASS: Rename Success');
            await runTest('File: Delete Folder', 'DELETE_FOLDER', { path: renamedFolder });
        } else {
            console.error('FAIL: Folder not renamed on OS');
        }
    } else {
        console.error('FAIL: Creation failed, skipping file tests.');
    }

    // 3. Path Guard Test
    console.log('\n[Guard] Testing Path Resolver Guard...');
    const result = await runTest('Guard: Rename non_existent', 'RENAME_FOLDER', { path: null });
    if (!result) {
        console.log('PASS: Guard correctly prevented execution of undefined targets.');
    } else {
        console.error('FAIL: Guard did not block undefined target.');
    }

    console.log('\n========================================');
    console.log('    VERIFICATION COMPLETE               ');
    console.log('========================================');
}

startVerification();
