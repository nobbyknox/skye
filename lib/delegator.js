/*
 * A thought about delegating a number of tasks to a variable number of workers. How will
 * we make optimal use of the workers by ensuring all tasks are allocated and that the
 * important and/or heavy operations have enough allocated workers?
 *
 * One possible solution is to make use of scenarios (is that the most applicable name?).
 * Here are some examples:
 *
 * Assumptions:
 *   + 5 tasks
 *   + Task A is computationally heavy and critically important
 *   + Task B is important
 *   + Task C, D, and E are light and may be performed by one worker
 *
 * Scenario 1 - only 1 instance
 *   + It will become the leader
 *   + It will handle all 5 tasks
 *
 * Scenario 2 - 2 instances
 *   + One leader
 *   + Leader and 1 worker will load balance task A
 *   + Leader will perform task B
 *   + Worker will also perform tasks C, D, and E
 *
 * Scenario 3 - 3 instances
 *   + 2 workers load balance Task A
 *   + Leader performs tasks B - E
 *
 * ...
 *
 * Scenario X - 10 instances
 *   + Leader performs no tasks
 *   + 7 workers load balance task A
 *   + 1 worker performs task B
 *   + 1 worker performs tasks C, D, and E
 */
const constants = require('./constants');
const myUtil = require('./util.js');
const config = myUtil.getConfig();
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

    if (!democracy.amITheLeader() || !config.enableDelegator) {
        return;
    }

    pRemoveDeadPeers();

    // Assign one task to each free peer, but not to the leader

    if (!taskAllocation[constants.TASKS.PROCESS_IMAGES]) {
        taskAllocation[constants.TASKS.PROCESS_IMAGES] = pGetFreePeer();

        if (taskAllocation[constants.TASKS.PROCESS_IMAGES]) {
            logger.info('Task "%s" delegated to peer "%s"', constants.TASKS.PROCESS_IMAGES, taskAllocation[constants.TASKS.PROCESS_IMAGES]);
        }
    }

    if (!taskAllocation[constants.TASKS.SEND_NOTIFICATIONS]) {
        taskAllocation[constants.TASKS.SEND_NOTIFICATIONS] = pGetFreePeer();

        if (taskAllocation[constants.TASKS.SEND_NOTIFICATIONS]) {
            logger.info('Task "%s" delegated to peer "%s"', constants.TASKS.SEND_NOTIFICATIONS, taskAllocation[constants.TASKS.SEND_NOTIFICATIONS]);
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
                    logger.debug('Task "%s" available for delegation', key);
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
