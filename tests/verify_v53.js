const dispatcher = require('../edith/controller/action_dispatcher');
const aliasService = require('../edith/services/alias');
const path = require('path');
const os = require('os');
const fs = require('fs');
const mongoose = require('mongoose');

async function runValidation() {
    console.log("=== V53 SEMANTIC REASONING VALIDATION ===\n");
    await mongoose.connect('mongodb://127.0.0.1:27017/edith_ai');
    console.log("Connected to MongoDB for Alias caching test...");
    
    // 1. Test Create Folder & Memory Hook
    const desktop = path.join(os.homedir(), 'Desktop');
    const newFolderTarget = path.join(desktop, 'EDITH_Test_Dir_V53');

    console.log("-> 1. Testing CREATE_FOLDER and Alias Hook...");
    const createAction = {
        intent: 'CREATE_FOLDER',
        parameters: { target: newFolderTarget }
    };
    
    // Dispatch
    let r1 = await dispatcher.dispatch(createAction, true);
    console.log("CREATE Result:", r1.message);
    
    // Verify Alias exists
    const aliasObj = await aliasService.resolve('EDITH_Test_Dir_V53');
    console.log("Alias Found in Memory:", !!aliasObj);

    // 2. Test Phase 2 Pre-emption
    console.log("\n-> 2. Testing Phase 2 Pre-emption Resolution...");
    const resolveAction = {
        intent: 'OPEN_PATH',
        parameters: { target: 'EDITH_Test_Dir_V53' } // We just created it, it shouldn't be in the index yet!
    };
    let r2 = await dispatcher.dispatch(resolveAction, true);
    console.log("OPEN_PATH Result (Phase 2):", r2.message);

    // 3. Test Human Failure Responses
    console.log("\n-> 3. Testing Missing Target Fallback...");
    const failAction = {
        intent: 'RENAME_FOLDER',
        parameters: { target: 'some_fictitious_ghost_folder', newName: 'ghost2' }
    };
    let r3 = await dispatcher.dispatch(failAction, true);
    console.log("FAIL Result:", r3.message);
    
    // Cleanup
    try {
        fs.rmdirSync(newFolderTarget);
    } catch(e) {}
    
    console.log("\n=== VALIDATION COMPLETE ===");
    mongoose.connection.close();
}

runValidation();
