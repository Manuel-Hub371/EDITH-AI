const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const DEBUG_MODE = process.env.EDITH_DEBUG === 'true';
const LOG_PATH = path.join(__dirname, '../logs/runtime_trace.log');

class Tracer {
    static log(tag, message) {
        if (!DEBUG_MODE) return;
        
        const timestamp = new Date().toISOString();
        const formattedMessage = `[${timestamp}] [${tag}] ${message}`;
        
        // Write to terminal with Cyan tag and bold
        console.log(`\x1b[1m\x1b[36m[${tag}]\x1b[0m ${message}`); 
        
        // Write to file
        try {
            const dir = path.dirname(LOG_PATH);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.appendFileSync(LOG_PATH, formattedMessage + '\n', 'utf8');
        } catch (err) {
            console.error("Tracer error writing to file:", err.message);
        }
    }
    
    // Tag wrappers
    static edith(msg) { this.log('EDITH', msg); }
    static nlp(msg) { this.log('NLP', msg); }
    static memory(msg) { this.log('MEMORY', msg); }
    static resolver(msg) { this.log('RESOLVER', msg); }
    static sandbox(msg) { this.log('SANDBOX', msg); }
    static executor(msg) { this.log('EXECUTOR', msg); }
    static multiStep(msg) { this.log('MULTI-STEP', msg); }
    static response(msg) { this.log('RESPONSE', msg); }
}

module.exports = Tracer;
