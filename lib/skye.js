const constants = require('./constants');
const redUtil = require('./util.js');
const config = redUtil.getConfig();
const logger = redUtil.getLogger();

const mqttClientStore = require('./mqtt/client-store');
const messageHandler = require('./mqtt/message-handler');
const messageSender = require('./mqtt/message-sender');

const moment = require('moment');
const mqtt = require('mqtt');
const uuid = require('uuid/v4');

const util = require('util');
const spawn = require('child_process').spawn;

let mqttClient;

process.skyeState = {
    me: uuid(),
    randToken: Math.random() * 1000,
    state: constants.STATES.UNKNOWN,
    leader: null,
    timeLastEvent: Date.now(),
    electionCalledAt: null,
    leaderAliveAt: Date.now(),
    votes: []
};

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
    console.log('Cleaning up...');

    console.log('Closing MQTT connection...');
    mqttClient.end();
});

// -----------------------------------------------------------------------------
// Fire it up
// -----------------------------------------------------------------------------

// let cat = spawn('cat', ['logo.txt']);
// cat.stdout.on('data', function (data) {
//     console.log(data.toString().replace('${version}', constants.VERSION));
//     logger.info('Skye process name "%s" with random token "%d"', process.skyeState.me, process.skyeState.randToken);
// });

// -----------------------------------------------------------------------------
// Main event loop
// -----------------------------------------------------------------------------

const timeWithoutLeader = 20000;
const durationOfElection = 5000;
const durationWithoutLeader = 25000;

setInterval(function() {
    // logger.trace('Top of main event loop');
    logger.trace('System status: %j', process.skyeState);

    // Send 'alive' message
    // messageSender.sendMessage('skye/alive', { name: process.skyeState.me });

    // If I'm the leader, inform the troops that I'm still alive
    if (process.skyeState.me === process.skyeState.leader) {
        logger.debug('Inform the troops that their leader is still alive');
        messageSender.sendMessage('skye/i-am-leader', { name: process.skyeState.me });
    } else {
        // Check if leader is still alive
        if (process.skyeState.state === constants.STATES.LEADER_ELECTED) {
            if ((Date.now() - process.skyeState.leaderAliveAt) > durationWithoutLeader) {
                logger.info('Uh–oh, our esteemed leader died. Last seen ' + ((Date.now() - process.skyeState.leaderAliveAt) / 1000) + ' seconds ago. Calling new election.');
                messageSender.sendMessage('skye/start-election', { name: process.skyeState.me });
            } else {
                logger.debug('Leader last seen %s seconds ago', (((Date.now() - process.skyeState.leaderAliveAt) / 1000)));
            }
        } else {
            logger.debug('Where is our leader?');
        }
    }

    if (process.skyeState.state === constants.STATES.UNKNOWN) {
        if (Date.now() - process.skyeState.timeLastEvent > timeWithoutLeader) {
            logger.info('We need to elect a leader');
            messageSender.sendMessage('skye/start-election', { name: process.skyeState.me });
        }
    } else if (process.skyeState.state === constants.STATES.VOTING) {
        if (Date.now() - process.skyeState.electionCalledAt > durationOfElection) {

            if (process.skyeState.votes && process.skyeState.votes.length > 0) {

                let highest = { name: '', randToken: -1 };

                process.skyeState.votes.forEach((vote) => {
                    if (vote.randToken > highest.randToken) {
                        highest = vote;
                    }
                });

                if (highest.name === process.skyeState.me) {
                    logger.info('I (%s) won the election! \\o/', process.skyeState.me);
                    process.skyeState.state = constants.STATES.LEADER_ELECTED;
                    process.skyeState.votes = [];

                    messageSender.sendMessage('skye/leader-elected', { name: process.skyeState.me });
                    messageSender.sendMessage('skye/i-am-leader', { name: process.skyeState.me });
                }
            }
        }
    }
}, 10000);
