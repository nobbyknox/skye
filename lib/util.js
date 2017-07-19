const constants = require('./constants');
const bunyan = require('bunyan');
const fs = require('fs');

let config = null;
let logger = null;

function getConfig() {
    if (config) {
        return config;
    } else {
        config = pLoadConfig();
        return config;
    }
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

function pLoadConfig() {

    const env = process.env[constants.ENVIRONMENT_VARIABLE];
    let privateConfig;

    if (env === 'development') {
        try {
            let stat = fs.statSync('config/private.js');

            if (stat.isFile()) {
                delete require.cache[require.resolve('../config/private.js')];
                privateConfig = require('../config/private.js');
            } else {
                delete require.cache[require.resolve('../config/development.js')];
                privateConfig = require('../config/development.js');
            }
        } catch (err) {
            delete require.cache[require.resolve('../config/development.js')];
            privateConfig = require('../config/development.js');
        }
    } else if (env === 'unittest') {
        try {
            let stat = fs.statSync('config/unittest-private.js');

            if (stat.isFile()) {
                delete require.cache[require.resolve('../config/unittest-private.js')];
                privateConfig = require('../config/unittest-private.js');
            } else {
                delete require.cache[require.resolve('../config/unittest.js')];
                privateConfig = require('../config/unittest.js');
            }
        } catch (err) {
            delete require.cache[require.resolve('../config/unittest.js')];
            privateConfig = require('../config/unittest.js');
        }
    } else {
        delete require.cache[require.resolve('../config/' + (env || 'development') + '.js')];
        privateConfig = require('../config/' + (env || 'development') + '.js');
    }

    return privateConfig;
}

// -----------------------------------------------------------------------------
// Module exports
// -----------------------------------------------------------------------------

module.exports = {
    getConfig,
    getLogger
};
