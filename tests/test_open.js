const axios = require('axios');
async function run() {
    try {
        console.log("Sending OPEN_PATH...");
        const res = await axios.post('http://localhost:5000/api/execute', { 
            action: { intent: 'OPEN_PATH', parameters: { target: 'documents' }, mode: 'execution', message: 'test' } 
        });
        console.log("Response:", res.data);
    } catch(err) {
        console.error(err.message);
    }
}
run();
