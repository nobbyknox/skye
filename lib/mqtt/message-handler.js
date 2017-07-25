const myUtil = require('../util.js');
const logger = myUtil.getLogger();
const democracy = require('../democracy');
const assignments = require('../assignments');
const imageProcessor = require('../image-processor');
const notifier = require('../notifier');

let handlers = [];

// -----------------------------------------------------------------------------
// Register all topic handlers
// -----------------------------------------------------------------------------

registerHandler(/skye\/ping/, dummyHandler);
registerHandler(/skye\/alive/, democracy.onAlive);
registerHandler(/skye\/start-election/, democracy.onStartElection);
registerHandler(/skye\/vote/, democracy.onVote);
registerHandler(/skye\/leader-elected/, democracy.onLeaderElected);
registerHandler(/skye\/i-am-leader/, democracy.onIAmLeader);
registerHandler(/skye\/task-allocation/, assignments.storeAssignments);
registerHandler(/skye\/process-image/, imageProcessor.processImage);
registerHandler(/skye\/send-notification/, notifier.sendNotification);

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

// -----------------------------------------------------------------------------
// Module export
// -----------------------------------------------------------------------------

module.exports = {
    processMessage
};
