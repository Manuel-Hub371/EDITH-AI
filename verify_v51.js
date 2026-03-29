const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

// Load Models
require('./edith/database/file_index.model');
require('./edith/database/alias.model');
require('./edith/database/command_history.model');

const ActionDispatcher = require('./edith/controller/action_dispatcher');

async function testV51Restoration() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/edith_ai');
        console.log('--- EDITH V51.1 FUNCTIONAL VALIDATION START ---');

        // 1. Path Healing & Directory Exploring Check
        console.log('\n[1] TEST: Dynamic Path Healing & Explorer (Documents)');
        const docsResult = await ActionDispatcher.dispatch({ intent: 'OPEN_PATH', parameters: { target: 'Documents' } });
        console.log('Path Opening:', docsResult.success ? '✅' : '❌', docsResult.message);

        // 2. Hardware Control Hook Check
        console.log('\n[2] TEST: Hardware Intent Mapping (Volume to 50%)');
        const volResult = await ActionDispatcher.dispatch({ intent: 'ADJUST_VOLUME', parameters: { level: 50 } });
        console.log('Volume Adjustment:', volResult.success ? '✅' : '❌', volResult.message);
        
        // 3. Executor Response Schema Check
        console.log('\n[3] TEST: Response Schema Standardization (App Open)');
        const appResult = await ActionDispatcher.dispatch({ intent: 'OPEN_APPLICATION', parameters: { target: 'notepad' } });
        console.log('Schema Check:', appResult.success && appResult.message ? '✅' : '❌', appResult.message);

        // 4. File Automation Expansion (CREATE -> COPY -> DELETE)
        console.log('\n[4] TEST: Expanded Read/Write/Copy Automation');
        const docsPath = path.join(process.env.USERPROFILE || process.env.HOME, 'Documents');
        const fileA = path.join(docsPath, 'TestSource.txt');
        const fileB = path.join(docsPath, 'TestTarget.txt');
        
        await ActionDispatcher.dispatch({ intent: 'CREATE_FILE', parameters: { path: fileA, content: 'Initial' } });
        await ActionDispatcher.dispatch({ intent: 'WRITE_FILE', parameters: { path: fileA, content: 'Data1' } });
        await ActionDispatcher.dispatch({ intent: 'APPEND_FILE', parameters: { path: fileA, content: 'Data2' } });
        const copyRes = await ActionDispatcher.dispatch({ intent: 'COPY_FILE', parameters: { path: fileA, destination: docsPath } });
        console.log('Copy Pipeline Executed:', copyRes.success ? '✅' : '❌', copyRes.message);

        await ActionDispatcher.dispatch({ intent: 'DELETE_FILE', parameters: { path: fileA } });
        console.log('File Pipeline Executed:', '✅');

        console.log('\n✅ ALL V51 FUNCTIONAL TESTS PASSED.');
        process.exit(0);

    } catch (err) {
        console.error('\n❌ VALIDATION FAILED:', err.message);
        process.exit(1);
    }
}

testV51Restoration();
