const constants = require('./constants');
const myUtil = require('./util.js');
const config = myUtil.getConfig();
const logger = myUtil.getLogger();

const mqttClientStore = require('./mqtt/client-store');
const messageHandler = require('./mqtt/message-handler');
const democracy = require('./democracy');

const mqtt = require('mqtt');
const util = require('util');

let mqttClient;

// -----------------------------------------------------------------------------
// Configure MQTT
// -----------------------------------------------------------------------------

let mqttOptions = {
    clientId: 'mqttjs_' + Math.random().toString(16).substr(2, 8),
    clean: true
};

if (config.mqtt.broker.username) {
    mqttOptions.username = config.mqtt.broker.username;
    mqttOptions.password = config.mqtt.broker.password;
}

mqttClient = mqtt.connect(util.format('mqtt://%s', config.mqtt.broker.host), mqttOptions);

// -----------------------------------------------------------------------------
// Events
// -----------------------------------------------------------------------------

mqttClient.on('connect', function () {
    const subs = {
        'skye/#': constants.MQTT.QOS.FIRE_AND_FORGET
    };

    mqttClient.subscribe(subs);

    // for (let key in subs) {
    //     logger.info('Subscribed to topic "%s" with QOS %d', key, subs[key]);
    // }

    mqttClientStore.store(mqttClient);
});

mqttClient.on('message', function (topic, message) {
    messageHandler.processMessage(topic, message);
});

mqttClient.on('close', (data) => {
    logger.info('MQTT client closed');
});

mqttClient.on('offline', () => {
    logger.info('MQTT client went offline');
});

mqttClient.on('reconnect', () => {
    logger.info('MQTT client reconnecting');
});

mqttClient.on('error', (err) => {
    logger.info('MQTT client received error: ' + err.message);
});

// -----------------------------------------------------------------------------

process.on('uncaughtException', function (err) {
    console.error(err.message);
});

process.on('SIGINT', function () {
    // console.error('Cleaning up...');
    // console.error('Closing MQTT connection...');
    mqttClient.end();
});

// -----------------------------------------------------------------------------
// Let the people choose
// -----------------------------------------------------------------------------

democracy.thrive();

// -----------------------------------------------------------------------------
// Imagine we have some work to perform...
// -----------------------------------------------------------------------------

setInterval(function () {
    if (democracy.amITheLeader()) {
        logger.debug('Leader doing work...');
    }
}, 3000);
