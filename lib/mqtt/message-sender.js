const constants = require('../constants');
const myUtil = require('../util.js');
const logger = myUtil.getLogger();
const clientStore = require('./client-store');

// -----------------------------------------------------------------------------
// Module functions
// -----------------------------------------------------------------------------

function sendMessage(topic, message, qosNumber = constants.MQTT.QOS.AT_LEAST_ONCE) {
    pPublish(topic, message, qosNumber);
}

// -----------------------------------------------------------------------------
// Private functions
// -----------------------------------------------------------------------------

function pPublish(topic, message, qosNum) {
    // logger.trace('TX [%s] %j', topic, message);

    let mqttClient = clientStore.get();

    if (!mqttClient) {
        logger.error('MQTT client is null');
        return;
    } else if (!mqttClient.connected) {
        logger.warn('MQTT not connected');
        return;
    }

    mqttClient.publish(topic, JSON.stringify(message), { qos: qosNum });
}

// -----------------------------------------------------------------------------
// Module export
// -----------------------------------------------------------------------------

module.exports = {
    sendMessage
};
