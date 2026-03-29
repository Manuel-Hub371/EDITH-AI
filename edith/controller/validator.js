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
        if (!payload.intent || typeof payload.intent !== 'string') {
            throw new Error("Invalid AI command structure: 'intent' is required for execution mode.");
        }
        if (payload.parameters && typeof payload.parameters !== 'object') {
            throw new Error("Invalid AI command structure: 'parameters' must be an object.");
        }
    }
    
    return true;
};

module.exports = { validateAction };
