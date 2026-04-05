const validateAction = (payload) => {
    // 1. Basic Structure
    if (!payload || typeof payload !== 'object') {
        throw new Error("Invalid AI command structure. Expected JSON object.");
    }
    
    // 2. Mode Field
    if (!['chat', 'execution'].includes(payload.mode)) {
        throw new Error("Invalid AI command structure. Missing or invalid 'mode'.");
    }
    
    // 3. Message Field (Standardized requirement)
    if (typeof payload.message !== 'string') {
        throw new Error("Invalid AI command structure. Missing or invalid 'message'.");
    }
    
    // 4. Execution Requirements
    if (payload.mode === 'execution') {
        if (!Array.isArray(payload.actions)) {
            throw new Error("Invalid AI command structure: 'actions' must be an array.");
        }
        if (payload.actions.length === 0) {
            throw new Error("Invalid AI command structure: 'actions' array cannot be empty in execution mode.");
        }
        for (const action of payload.actions) {
            if (!action.intent || typeof action.intent !== 'string') {
                throw new Error("Invalid AI command structure: each step requires an 'intent'.");
            }
        }
    }
    
    return true;
};

module.exports = { validateAction };
