const myUtil = require('../util.js');
const logger = myUtil.getLogger();

let mqttClient;

function store(warmClient) {
    if (warmClient) {
        // logger.debug('Storing MQTT client');
        mqttClient = warmClient;
    }
}

function get() {
    if (mqttClient) {
        return mqttClient;
    } else {
        logger.warn('No MQTT client');
        return null;
    }
}

// -----------------------------------------------------------------------------
// Module export
// -----------------------------------------------------------------------------

module.exports = {
    store,
    get
};
