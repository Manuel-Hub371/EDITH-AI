const processManager = require('./processManager');

/**
 * Intelligent Launcher Entry Point (V50.0)
 */
module.exports = {
    launch: async (target) => {
        const result = await processManager.launchApp(target);
        return result.message;
    },
    close: async (target) => {
        return await processManager.closeApplication(target);
    }
};
