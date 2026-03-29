const axios = require('axios');
const path = require('path');
const os = require('os');

const API_URL = 'http://localhost:5000/api/execute';

const tests = [
    { intent: 'OPEN_APPLICATION', target: 'chrome', desc: 'Open Chrome' },
    { intent: 'OPEN_PATH', target: 'documents', desc: 'Open Documents' },
    { intent: 'CREATE_FOLDER', target: path.join(os.homedir(), 'Desktop', 'TestFolder'), desc: 'Create a folder named TestFolder' },
    { intent: 'RENAME_FOLDER', target: path.join(os.homedir(), 'Desktop', 'TestFolder'), params: { newName: 'ProjectFolder' }, desc: 'Rename TestFolder to ProjectFolder' },
    { intent: 'CREATE_FILE', target: path.join(os.homedir(), 'Desktop', 'ProjectFolder', 'test.txt'), desc: 'Create a file test.txt' },
    { intent: 'WRITE_FILE', target: path.join(os.homedir(), 'Desktop', 'ProjectFolder', 'test.txt'), params: { content: 'Hello' }, desc: 'Write "Hello" into test.txt' },
    { intent: 'READ_FILE', target: path.join(os.homedir(), 'Desktop', 'ProjectFolder', 'test.txt'), desc: 'Read test.txt' },
    { intent: 'ADJUST_VOLUME', params: { level: 80 }, desc: 'Increase volume to 80%' },
    { intent: 'ADJUST_BRIGHTNESS', params: { level: 40 }, desc: 'Set brightness to 40%' },
    { intent: 'MOVE_FILE', target: path.join(os.homedir(), 'Desktop', 'ProjectFolder', 'test.txt'), params: { destination: path.join(os.homedir(), 'Desktop') }, desc: 'Move test.txt out to Desktop' }
];

async function runTests() {
    console.log('--- STARTING INTEGRATION TESTS ---');
    for (const test of tests) {
        console.log(`\nTesting: [${test.intent}] - ${test.desc}`);
        const payload = {
            action: {
                intent: test.intent,
                parameters: { target: test.target, path: test.target, app: test.target, ...test.params },
                mode: 'execution',
                message: 'Integration test simulation'
            },
            sessionId: 'test-session-1'
        };

        try {
            const res = await axios.post(API_URL, payload);
            let finalRes = res.data;
            if (finalRes.status === 'NEED_CONFIRMATION') {
                console.log(`[Test] Auto-confirming actionId: ${finalRes.actionId}`);
                const confirmRes = await axios.post('http://localhost:5000/api/execute/confirm', {
                    actionId: finalRes.actionId,
                    confirmed: true
                });
                finalRes = confirmRes.data;
            }
            console.log('Result:', finalRes);
            await new Promise(r => setTimeout(r, 2000)); // sleep to allow filesystem sync
        } catch (err) {
            console.error('Test Failed:', err.message);
            if (err.response) {
                console.error('Response:', err.response.data);
            }
        }
    }
    console.log('\n--- TESTS COMPLETED ---');
}

runTests();
