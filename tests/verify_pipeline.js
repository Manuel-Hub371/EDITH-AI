/**
 * EDITH AI — FINAL PIPELINE VERIFICATION (Phase 1-3)
 * This script bypasses the Electron UI layer to validate the core system pipeline.
 */
const axios = require('axios');
const path = require('path');
const os = require('os');
const fs = require('fs');

const HOME = os.homedir();
const docs = path.join(HOME, 'Documents');
const testFolder = path.join(docs, 'FinalTestFolder');
const projFolder = path.join(docs, 'FinalProjectFolder');
const txtFile = path.join(projFolder, 'final.txt');

const API = 'http://localhost:5000/api/execute';

async function runTest(desc, intent, params) {
    console.log(`\n>>> [${intent}] ${desc}`);
    try {
        const payload = { action: { intent, parameters: params, mode: 'execution', message: 'final-verify' }, sessionId: 'verify' };
        let res = await axios.post(API, payload);
        let data = res.data;
        
        if (data.status === 'NEED_CONFIRMATION' && data.actionId) {
            console.log(`   [CONFIRMATION] Auto-confirming ${data.actionId}...`);
            const cres = await axios.post(`${API}/confirm`, { actionId: data.actionId, confirmed: true });
            data = cres.data;
        }
        
        console.log(`<<< ${JSON.stringify(data)}`);
        return data;
    } catch (err) {
        console.error(`!!! FAILED: ${err.message}`);
        return { success: false, message: err.message };
    }
}

async function verify() {
    console.log('========================================');
    console.log('    EDITH AI — FINAL SYSTEM VERIFICATION');
    console.log('========================================\n');

    // 1. Create Folder
    let r = await runTest('Creating Folder', 'CREATE_FOLDER', { path: testFolder });
    const step1 = fs.existsSync(testFolder);
    console.log(`  [${step1 ? 'PASS' : 'FAIL'}] Folder exists: ${testFolder}`);

    // 2. Rename Folder
    r = await runTest('Renaming Folder', 'RENAME_FOLDER', { path: testFolder, newName: 'FinalProjectFolder' });
    const step2 = fs.existsSync(projFolder);
    console.log(`  [${step2 ? 'PASS' : 'FAIL'}] Folder renamed: ${projFolder}`);

    // 3. Create File
    r = await runTest('Creating File', 'CREATE_FILE', { path: txtFile, content: 'Initial' });
    const step3 = fs.existsSync(txtFile);
    console.log(`  [${step3 ? 'PASS' : 'FAIL'}] File exists: ${txtFile}`);

    // 4. Write File
    r = await runTest('Writing Content', 'WRITE_FILE', { path: txtFile, content: 'EDITH Pipeline Verified' });
    const content = fs.readFileSync(txtFile, 'utf8');
    const step4 = content.trim() === 'EDITH Pipeline Verified';
    console.log(`  [${step4 ? 'PASS' : 'FAIL'}] Content correct: "${content}"`);

    // 5. System Control: Volume
    r = await runTest('Adjusting Volume', 'ADJUST_VOLUME', { level: 44 });
    console.log(`  [${r.success ? 'PASS' : 'FAIL'}] Volume adjusted (Backend confirmed)`);

    // 6. App Control: Open Notepad (Non-blocking)
    r = await runTest('Opening App', 'OPEN_APPLICATION', { app: 'notepad', path: 'notepad' });
    console.log(`  [${r.success ? 'PASS' : 'FAIL'}] App opened: ${r.message}`);

    console.log('\n========================================');
    console.log('    VERIFICATION COMPLETE');
    console.log('========================================');
}

verify();
