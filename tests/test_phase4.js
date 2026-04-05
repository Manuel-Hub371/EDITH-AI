/**
 * Phase 4 Verification Test
 * Tests the AI Gateway's classification logic and OpenRouter connectivity.
 */
const aiGateway = require('../edith/services/ai_gateway');

function testClassifier() {
    console.log('--- Phase 4: Task Classifier Tests ---\n');
    
    const tests = [
        // Simple → Google AI
        { input: "Open Notepad", expected: "google" },
        { input: "Set volume to 50%", expected: "google" },
        { input: "Create a folder named Test", expected: "google" },
        { input: "Delete notes.txt", expected: "google" },
        { input: "Read todo.txt", expected: "google" },
        { input: "What time is it?", expected: "google" },
        
        // Complex → OpenRouter
        { input: "Organize my Desktop by file type into separate folders", expected: "openrouter" },
        { input: "Analyze my Documents folder and tell me which files are largest", expected: "openrouter" },
        { input: "Write a Python script that renames all .jpg files in Downloads", expected: "openrouter" },
        { input: "First create a folder, then move all .txt files into it, and finally delete the originals", expected: "openrouter" },
        { input: "Suggest the best way to organize my project files", expected: "openrouter" },
        { input: "Explain why my disk usage is so high and recommend cleanup steps", expected: "openrouter" },
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
        const result = aiGateway.classifyTask(test.input);
        const status = result.route === test.expected ? '✅' : '❌';
        if (result.route === test.expected) passed++; else failed++;
        console.log(`${status} "${test.input.substring(0, 55)}" → ${result.route.toUpperCase()} (expected: ${test.expected.toUpperCase()}) | Reason: ${result.reason}`);
    }
    
    console.log(`\n--- Results: ${passed}/${passed + failed} passed ---`);
    return failed === 0;
}

async function testOpenRouterConnectivity() {
    console.log('\n--- Phase 4: OpenRouter Connectivity Test ---\n');
    
    try {
        const openRouter = require('../edith/services/openrouter_client');
        console.log(`Model: ${openRouter.MODEL}`);
        console.log(`Rate Limiter: ${openRouter.limiter.remaining} requests remaining\n`);
        
        const rawText = await openRouter.query("Respond with a short JSON: {\"status\": \"ok\", \"message\": \"OpenRouter connected\"}");
        console.log(`[Response] ${rawText}`);
        
        const parsed = JSON.parse(rawText);
        if (parsed.status === 'ok' || parsed.mode || parsed.message) {
            console.log('✅ OpenRouter API is working!');
            return true;
        }
    } catch (err) {
        console.log(`❌ OpenRouter connection failed: ${err.message}`);
        return false;
    }
}

async function main() {
    console.log('=== EDITH Phase 4 — NLP Engine Verification Suite ===\n');
    
    const classifierOk = testClassifier();
    const openRouterOk = await testOpenRouterConnectivity();
    
    console.log('\n=== FINAL VERDICT ===');
    console.log(`Classifier: ${classifierOk ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`OpenRouter: ${openRouterOk ? '✅ PASS' : '❌ FAIL'}`);
    
    process.exit(classifierOk && openRouterOk ? 0 : 1);
}

main();
