const myUtil = require('./util.js');
const logger = myUtil.getLogger();

let assignments = {};

// -----------------------------------------------------------------------------
// Public functions
// -----------------------------------------------------------------------------

function getAssignments() {
    return assignments;
}

function storeAssignments(topic, mesgObj) {
    assignments = mesgObj;

    logger.trace('New assignments: %j', assignments);
}

// -----------------------------------------------------------------------------
// Module export
// -----------------------------------------------------------------------------

module.exports = {
    getAssignments,
    storeAssignments
};
