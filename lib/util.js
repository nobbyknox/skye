const bunyan = require('bunyan');

let logger = null;

const config = {
    logger: {
        name: pGetStringValue('LOGGER_NAME', 'skye'),
        level: pGetStringValue('LOGGER_LEVEL', 'debug'),
        src: pGetBooleanValue('LOGGER_SRC', false)
    },
    mqtt: {
        broker: {
            host: pGetStringValue('MQTT_BROKER_HOST', '127.0.0.1'),
            username: pGetStringValue('MQTT_BROKER_USERNAME'),
            password: pGetStringValue('MQTT_BROKER_PASSWORD')
        }
    },
    enableDelegator: pGetBooleanValue('ENABLE_DELEGATOR', false)
};

function getConfig() {
    return config;
}

function getLogger() {
    if (!logger) {
        logger = bunyan.createLogger(getConfig().logger);
    }

    return logger;
}

// -----------------------------------------------------------------------------
// Private functions
// -----------------------------------------------------------------------------

function pGetStringValue(name, defaultValue = '') {
    return (process.env[name] && process.env[name] !== 'null' ? process.env[name] : null);
}

function pGetBooleanValue(name, defaultValue = false) {
    return (process.env[name] ? (process.env[name] === 'true') : defaultValue);
}

// function pGetNumberValue(name, defaultValue = 0) {
//     return (process.env[name] ? parseInt(process.env[name], 10) : defaultValue);
// }

// -----------------------------------------------------------------------------
// Module exports
// -----------------------------------------------------------------------------

module.exports = {
    getConfig,
    getLogger
};
