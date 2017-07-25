const constants = require('./constants');
const myUtil = require('./util.js');
const logger = myUtil.getLogger();
const messageSender = require('./mqtt/message-sender');
const democracy = require('./democracy');

const delegatorLoopInterval = 10000;
const deadPeerTimeout = 15000;

const taskAllocation = {};
taskAllocation[constants.TASKS.PROCESS_IMAGES] = '';
taskAllocation[constants.TASKS.SEND_NOTIFICATIONS] = '';

// -----------------------------------------------------------------------------
// Public functions
// -----------------------------------------------------------------------------

function start() {

    pManageDelegation();

    setInterval(() => {
        pManageDelegation();
    }, delegatorLoopInterval);
}

// -----------------------------------------------------------------------------
// Private functions
// -----------------------------------------------------------------------------

function pManageDelegation() {

    if (!democracy.amITheLeader()) {
        return;
    }

    pRemoveDeadPeers();

    // Assign one task to each free peer, but not to the leader

    if (!taskAllocation[constants.TASKS.PROCESS_IMAGES]) {
        taskAllocation[constants.TASKS.PROCESS_IMAGES] = pGetFreePeer();

        if (taskAllocation[constants.TASKS.PROCESS_IMAGES]) {
            logger.info('Task "%s" allocated to peer "%s"', constants.TASKS.PROCESS_IMAGES, taskAllocation[constants.TASKS.PROCESS_IMAGES]);
        }
    }

    if (!taskAllocation[constants.TASKS.SEND_NOTIFICATIONS]) {
        taskAllocation[constants.TASKS.SEND_NOTIFICATIONS] = pGetFreePeer();

        if (taskAllocation[constants.TASKS.SEND_NOTIFICATIONS]) {
            logger.info('Task "%s" allocated to peer "%s"', constants.TASKS.SEND_NOTIFICATIONS, taskAllocation[constants.TASKS.SEND_NOTIFICATIONS]);
        }
    }

    messageSender.sendMessage('skye/task-allocation', taskAllocation);
}

function pRemoveDeadPeers() {

    let peers = democracy.getStateOfTheNation().peers;

    if (!peers || peers.length === 0) {
        return;
    }

    for (let i = peers.length - 1; i >= 0; i--) {
        logger.trace('Peer "%s" seen %d seconds ago', peers[i].name, ((Date.now() - peers[i].lastSeenAt) / 1000));

        if (Date.now() - peers[i].lastSeenAt > deadPeerTimeout) {
            logger.debug('Remove dead peer "%s", seen %d seconds ago', peers[i].name, ((Date.now() - peers[i].lastSeenAt) / 1000));

            for (key in taskAllocation) {
                if (peers[i].name === taskAllocation[key]) {
                    logger.debug('Task "%s" available for reallocation', key);
                    taskAllocation[key] = '';
                }
            }

            peers.splice(i, 1);
        }
    }
}

function pGetFreePeer() {

    let freePeers = democracy.getStateOfTheNation().peers.filter((peer) => {
        let found = false;

        // Indicate that the leader is unavailable for task allocation
        if (peer.name === democracy.getStateOfTheNation().me && democracy.amITheLeader()) {
            return false;
        }

        for (key in taskAllocation) {
            if (taskAllocation[key] && taskAllocation[key] === peer.name) {
                found = true;
            }
        }

        return !found;
    });

    return (freePeers && freePeers.length > 0 ? freePeers[0].name : '');
}

// -----------------------------------------------------------------------------
// Module export
// -----------------------------------------------------------------------------

module.exports = {
    start
};
