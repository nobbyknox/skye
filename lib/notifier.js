const constants = require('./constants');
const myUtil = require('./util.js');
const logger = myUtil.getLogger();
const democracy = require('./democracy');
const assignments = require('./assignments');

// -----------------------------------------------------------------------------
// Public functions
// -----------------------------------------------------------------------------

function sendNotification(topic, mesgObj) {
    if (assignments.getAssignments()[constants.TASKS.SEND_NOTIFICATIONS] === democracy.getStateOfTheNation().me ||
        (!assignments.getAssignments()[constants.TASKS.SEND_NOTIFICATIONS] && democracy.amITheLeader())) {

        logger.info('[WORKING] Sending notification...');
    }
}

// -----------------------------------------------------------------------------
// Module export
// -----------------------------------------------------------------------------

module.exports = {
    sendNotification
};
