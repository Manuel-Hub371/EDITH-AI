/**
 * Command Parser (V38.0)
 * Validates intents and provides context enrichment for the execution pipeline.
 */
class CommandParser {
    constructor() {
        this.validIntents = [
            'OPEN_APPLICATION', 'CLOSE_APPLICATION', 'OPEN_PATH',
            'CREATE_FILE', 'CREATE_FOLDER',
            'READ_FILE', 'DELETE_FILE', 'DELETE_FOLDER',
            'MOVE_FILE', 'COPY_FILE',
            'SEARCH_FILE', 'SUMMARIZE_FILE',
            'OPEN_WEBSITE',
            // Automation V38.1
            'FOCUS_WINDOW', 'MINIMIZE_WINDOW', 'MAXIMIZE_WINDOW', 'RESTORE_WINDOW', 
            'ARRANGE_WINDOWS', 'ADJUST_VOLUME', 'ADJUST_BRIGHTNESS', 
            'LOCK_COMPUTER', 'SYSTEM_SLEEP', 'SYSTEM_STATUS'
        ];
    }

    /**
     * Parses and validates a raw action object from the AI.
     * @param {Object} action Raw action object.
     * @returns {Object} Validated and enriched action.
     */
    parse(action) {
        if (!action || !action.intent) {
            throw new Error("Invalid command: Missing intent.");
        }

        if (!this.validIntents.includes(action.intent)) {
             // Try to map old verb-based intents if they bleed through
             const mapping = {
                 'create': action.type === 'manage_path' ? 'CREATE_FOLDER' : 'CREATE_FILE',
                 'delete': action.type === 'manage_path' ? 'DELETE_FOLDER' : 'DELETE_FILE',
                 'open_application': 'OPEN_APPLICATION',
                 'close_application': 'CLOSE_APPLICATION',
                 'read_file': 'READ_FILE'
             };

             const mappedIntent = mapping[action.intent.toLowerCase()] || mapping[action.type];
             if (mappedIntent) {
                 action.intent = mappedIntent;
             } else {
                 throw new Error(`Unsupported intent: ${action.intent}`);
             }
        }

        // Potential for context enrichment (last_path, etc.) happens at the controller level
        return action;
    }
}

module.exports = CommandParser;
