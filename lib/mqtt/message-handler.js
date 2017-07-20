const myUtil = require('../util.js');
const logger = myUtil.getLogger();
const constants = require('../constants');
const messageSender = require('./message-sender');

let handlers = [];

// -----------------------------------------------------------------------------
// Register all topic handlers
// -----------------------------------------------------------------------------

registerHandler(/skye\/ping/, dummyHandler);
registerHandler(/skye\/alive/, aliveHandler);
registerHandler(/skye\/start-election/, startElectionHandler);
registerHandler(/skye\/vote/, voteHandler);
registerHandler(/skye\/leader-elected/, leaderElectedHandler);
registerHandler(/skye\/i-am-leader/, iAmLeaderHandler);

// -----------------------------------------------------------------------------
// Main module functions
// -----------------------------------------------------------------------------

function processMessage(topic, rawMessage) {

    // logger.trace('RX [%s] %s', topic, rawMessage.toString());

    if (handlers && handlers.length > 0) {
        let handlerFound = false;

        for (let i = 0; i < handlers.length; i++) {
            if (topic.match(handlers[i].topicRegEx)) {
                handlerFound = true;

                let mesgObj = JSON.parse(rawMessage.toString());
                handlers[i].handler(topic, mesgObj);

                break;
            }
        }

        if (!handlerFound) {
            logger.warn('No handler registered for topic "%s"', topic);
        }
    } else {
        logger.warn('No topic handlers registered');
    }
}

// -----------------------------------------------------------------------------
// Private functions
// -----------------------------------------------------------------------------

function registerHandler(topicRegEx, handler) {
    // logger.info('Registering topic handler for "%s"', topicRegEx);
    handlers.push({ topicRegEx: topicRegEx, handler: handler });
}

// -----------------------------------------------------------------------------
// Topic handlers
// -----------------------------------------------------------------------------

function dummyHandler(topic, mesgObj) {
    logger.debug('"dummyHandler" for topic "%s"', topic);
}

function aliveHandler(topic, mesgObj) {
    // logger.debug('"aliveHandler" for topic "%s"', topic);
    //
    // if (mesgObj && mesgObj.name === process.skyeState.me) {
    //     logger.debug('   oh, that\'s me :-)');
    // }
}

function startElectionHandler(topic, mesgObj) {
    process.skyeState.timeLastEvent = Date.now();
    process.skyeState.electionCalledAt = Date.now();
    process.skyeState.randToken = Math.random() * 1000;
    process.skyeState.state = constants.STATES.START_ELECTION;
    process.skyeState.votes = [];

    messageSender.sendMessage('skye/vote', { name: process.skyeState.me, randToken: process.skyeState.randToken });

}

function voteHandler(topic, mesgObj) {
    process.skyeState.timeLastEvent = Date.now();
    process.skyeState.state = constants.STATES.VOTING;

    logger.debug('Vote received from "%s" with token "%s"', mesgObj.name, mesgObj.randToken);

    process.skyeState.votes.push(mesgObj);
}

function leaderElectedHandler(topic, mesgObj) {
    process.skyeState.timeLastEvent = Date.now();
    process.skyeState.state = constants.STATES.LEADER_ELECTED;
    process.skyeState.leader = mesgObj.name;
    process.skyeState.leaderAliveAt = Date.now();

    if (process.skyeState.me === mesgObj.name) {
        logger.debug('I (%s) am the new leader', mesgObj.name);
    } else {
        logger.debug('"%s" is the new leader', mesgObj.name);
    }
}

function iAmLeaderHandler(topic, mesgObj) {

    process.skyeState.timeLastEvent = Date.now();
    process.skyeState.leaderAliveAt = Date.now();

    if (process.skyeState.state === constants.STATES.UNKNOWN) {
        process.skyeState.state = constants.STATES.LEADER_ELECTED;
        process.skyeState.leader = mesgObj.name;

        logger.debug('I\'m told "%s" is the leader', mesgObj.name);
    }

}

// -----------------------------------------------------------------------------
// Module export
// -----------------------------------------------------------------------------

module.exports = {
    processMessage
};
