const constants = require('../constants');
const myUtil = require('../util.js');
const logger = myUtil.getLogger();
const clientStore = require('./client-store');

// -----------------------------------------------------------------------------
// Module functions
// -----------------------------------------------------------------------------

function buildAndPublish(topic, comm, clientId, token, qosNumber = constants.MQTT.QOS.AT_LEAST_ONCE) {

    if (!clientId) {
        throw new Error('Client ID not specified');
    }

    let mqttMessageObject = {
        meta: {
            clientId: clientId || '',
            token: token || '',
            status: constants.MQTT.STATUS.OKAY,
            messages: []
        },
        comm: comm
    };

    publish(topic, mqttMessageObject, qosNumber);

}

function buildAndPublishError(topic, err, clientId, token, qosNumber = constants.MQTT.QOS.AT_LEAST_ONCE) {

    if (!clientId) {
        throw new Error('Client ID not specified');
    }

    let mqttMessageObject = {
        meta: {
            clientId: clientId || '',
            token: token || '',
            status: constants.MQTT.STATUS.BAD_REQUEST,
            messages: err.messages || [err.message]
        },
        comm: null
    };

    publish(topic, mqttMessageObject, qosNumber);

}

function sendMessage(topic, message, qosNumber = constants.MQTT.QOS.AT_LEAST_ONCE) {
    publish(topic, message, qosNumber);
}

// -----------------------------------------------------------------------------
// Private functions
// -----------------------------------------------------------------------------

function publish(topic, message, qosNum) {
    // logger.trace('TX [%s] %j', topic, message);

    // TODO: Check for null mqttClient
    let mqttClient = clientStore.get();

    mqttClient.publish(topic, JSON.stringify(message), { qos: qosNum });
}

// -----------------------------------------------------------------------------
// Module export
// -----------------------------------------------------------------------------

module.exports = {
    buildAndPublish,
    buildAndPublishError,
    sendMessage
};
