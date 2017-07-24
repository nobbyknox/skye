const bunyan = require('bunyan');

let logger = null;

const config = {
    logger: {
        name: pGetStringValue('logger_name', 'skye'),
        level: pGetStringValue('logger_level', 'debug'),
        src: pGetBooleanValue('logger_src', false)
    },
    mqtt: {
        broker: {
            host: pGetStringValue('mqtt_broker_host', '127.0.0.1'),
            username: pGetStringValue('mqtt_broker_host'),
            password: pGetStringValue('mqtt_broker_host')
        }
    },
    enableDelegator: pGetBooleanValue('enableDelegator', false)
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

function pGetNumberValue(name, defaultValue = 0) {
    return (process.env[name] ? parseInt(process.env[name], 10) : defaultValue);
}

// -----------------------------------------------------------------------------
// Module exports
// -----------------------------------------------------------------------------

module.exports = {
    getConfig,
    getLogger
};
