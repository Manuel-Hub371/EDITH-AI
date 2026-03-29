/**
 * EDITH AI — RENAME FIX VERIFICATION
 * Validates Phase 1, 2, and 3 synchronization after a folder rename.
 */
const axios = require('axios');
const path = require('path');
const os = require('os');
const fs = require('fs');
const mongoose = require('mongoose');

// Load environment variables for DB connection
require('dotenv').config();

const HOME = os.homedir();
const docs = path.join(HOME, 'Documents');
const oldPath = path.join(docs, 'ManuelTextingFolder');
const newPath = path.join(docs, 'TextingFolder');
const API = 'http://localhost:5000/api/execute';

async function verify() {
    console.log('========================================');
    console.log('    EDITH AI — RENAME & SYNC VERIFICATION');
    console.log('========================================\n');

    try {
        // 0. Connect to MongoDB for direct verification
        const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/edith_ai';
        await mongoose.connect(MONGO_URI);
        const Alias = require('../edith/database/alias.model');
        const FileIndex = require('../edith/database/file_index.model');

        // 1. Setup: Create folder and Alias
        if (!fs.existsSync(oldPath)) fs.mkdirSync(oldPath);
        if (fs.existsSync(newPath)) fs.rmdirSync(newPath, { recursive: true });
        
        await Alias.updateOne({ alias: 'mtf' }, { $set: { targetPath: oldPath, type: 'directory' } }, { upsert: true });
        await FileIndex.updateOne({ path: oldPath }, { $set: { path: oldPath, name: 'ManuelTextingFolder', type: 'directory' } }, { upsert: true });
        
        console.log(`[Setup] Created folder: ${oldPath}`);
        console.log(`[Setup] Set Alias "mtf" -> ${oldPath}`);

        // 2. Execute Rename via API
        console.log(`\n[Test] Renaming via API: "Rename ManuelTextingFolder to TextingFolder"`);
        const payload = { 
            action: { 
                intent: 'RENAME_FOLDER', 
                parameters: { path: oldPath, newName: 'TextingFolder' }, 
                mode: 'execution', 
                message: 'test-rename-fix' 
            }, 
            sessionId: 'verify-rename' 
        };
        
        const res = await axios.post(API, payload);
        let data = res.data;

        if (data.status === 'NEED_CONFIRMATION') {
            const cres = await axios.post(`${API}/confirm`, { actionId: data.actionId, confirmed: true });
            data = cres.data;
        }

        console.log(`[API Response] ${JSON.stringify(data)}`);

        // 2.5 Grace period for Watcher/Indexer sync
        console.log(`[Test] Waiting for system to stabilize...`);
        await new Promise(r => setTimeout(r, 3000));

        // 3. Phase 3: Filesystem Validation
        const fsExistsOld = fs.existsSync(oldPath);
        const fsExistsNew = fs.existsSync(newPath);
        console.log(`\n[Phase 3] OS Validation:`);
        console.log(`  - Old path exists: ${fsExistsOld} (Expect: false)`);
        console.log(`  - New path exists: ${fsExistsNew} (Expect: true)`);

        // 4. Phase 1: Index Validation
        const indexOld = await FileIndex.findOne({ path: oldPath });
        const indexNew = await FileIndex.findOne({ path: newPath });
        console.log(`\n[Phase 1] Index Validation:`);
        console.log(`  - Old path in DB: ${!!indexOld} (Expect: false)`);
        console.log(`  - New path in DB: ${!!indexNew} (Expect: true)`);

        // 5. Phase 2: Alias Validation
        const alias = await Alias.findOne({ alias: 'mtf' });
        console.log(`\n[Phase 2] Alias Validation:`);
        console.log(`  - Alias "mtf" points to: ${alias.targetPath}`);
        const aliasValid = alias.targetPath.toLowerCase() === newPath.toLowerCase();
        console.log(`  - Alias sync: ${aliasValid ? 'PASS' : 'FAIL'}`);

        console.log('\n========================================');
        if (fsExistsNew && !fsExistsOld && indexNew && !indexOld && aliasValid) {
            console.log('    VERIFICATION: SUCCESS');
        } else {
            console.log('    VERIFICATION: FAILED');
        }
        console.log('========================================');

    } catch (err) {
        console.error(`\n!!! ERROR: ${err.message}`);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

verify();
