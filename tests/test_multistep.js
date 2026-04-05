/**
 * Pipeline Verification for Multi-Step NLP Execution
 */
const axios = require('axios');

async function testPipeline() {
    console.log("--- Multi-Step Pipeline Test ---");
    
    const port = process.env.NODE_PORT || 5000;
    const apiUrl = `http://localhost:${port}/api/chat`;

    try {
        console.log("Sending complex command to API Server...");
        const response = await axios.post(apiUrl, {
            message: "Create a folder named MultiStepTest on my Desktop and then write a file named step2.txt into it.",
            sessionId: "test-multistep-1"
        });

        const data = response.data;
        if (data.status === 'success') {
            const numActions = data.action.actions ? data.action.actions.length : 0;
            console.log(`✅ AI Gateway Response normalized successfully. Actions detected: ${numActions}`);
            
            if (numActions >= 1) {
                console.log("Extracted Steps:");
                data.action.actions.forEach((a, i) => console.log(` [${i+1}] ${a.intent} -> ${JSON.stringify(a.parameters)}`));
                
                // Now feed into /api/execute
                console.log("\nExecuting pipeline...");
                let execRes = await axios.post(`http://localhost:${port}/api/execute`, {
                    action: data.action,
                    sessionId: "test-multistep-1"
                });
                
                while (execRes.data.status === 'NEED_CONFIRMATION') {
                    console.log(`[Test] Auto-confirming actionId: ${execRes.data.actionId}`);
                    execRes = await axios.post(`http://localhost:${port}/api/execute/confirm`, {
                        actionId: execRes.data.actionId,
                        confirmed: true
                    });
                }
                
                console.log("✅ Final Execution Result:");
                console.log(JSON.stringify(execRes.data, null, 2));
            } else {
                console.log("❌ Failed to parse into multiple steps");
            }
        }
    } catch (err) {
        console.error("❌ Test failed:");
        console.error(err);
    }
}

testPipeline();
