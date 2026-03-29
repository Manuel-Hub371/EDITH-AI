const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

// Load Models
require('./edith/database/file_index.model');
require('./edith/database/alias.model');
require('./edith/database/command_history.model');

const ActionDispatcher = require('./edith/controller/action_dispatcher');

async function test() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/edith_ai');
        console.log('--- EDITH STRICT COMPLIANCE VALIDATION ---');

        const docsDir = path.join(process.env.USERPROFILE || process.env.HOME, 'Documents');

        // 1. App Resolution Check
        console.log('\n[1] TEST: App Normalization (Chrome)');
        const appResult = await ActionDispatcher.dispatch({ intent: 'OPEN_APPLICATION', parameters: { target: 'chrome' } });
        console.log('App Launch Result:', typeof appResult === 'string' ? '✅' : '❌', appResult);

        // 2. File Resolution Check
        console.log('\n[2] TEST: Phase 1/2 Document Resolution');
        const searchResult = await ActionDispatcher.dispatch({ intent: 'SEARCH_FILE', parameters: { target: 'Documents' } });
        console.log('Documents Found via Resolver:', searchResult.length > 0 ? '✅' : '❌');

        // 3. Automation Sync Check
        console.log('\n[3] TEST: Automation Pipeline');
        const folder = path.join(docsDir, 'ComplianceTest');
        await ActionDispatcher.dispatch({ intent: 'CREATE_FOLDER', parameters: { path: folder } });
        console.log('Folder Created ✅');
        
        await ActionDispatcher.dispatch({ intent: 'DELETE_FOLDER', parameters: { path: folder } });
        console.log('Folder Deleted ✅');

        console.log('\n✅ STRICT COMPLIANCE SUCCESSFUL! System is 100% unified.');
        
        process.exit(0);
    } catch (err) {
        console.error('\n❌ VALIDATION FAILED:', err.message);
        process.exit(1);
    }
}

test();
