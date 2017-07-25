const constants = require('./constants');
const myUtil = require('./util.js');
const logger = myUtil.getLogger();
const democracy = require('./democracy');
const assignments = require('./assignments');

// -----------------------------------------------------------------------------
// Public functions
// -----------------------------------------------------------------------------

function processImage(topic, mesgObj) {
    if (assignments.getAssignments()[constants.TASKS.PROCESS_IMAGES] === democracy.getStateOfTheNation().me ||
        (!assignments.getAssignments()[constants.TASKS.PROCESS_IMAGES] && democracy.amITheLeader())) {

        logger.info('[WORKING] Processing image...');
    }
}

// -----------------------------------------------------------------------------
// Module export
// -----------------------------------------------------------------------------

module.exports = {
    processImage
};
