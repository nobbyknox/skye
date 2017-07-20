const constants = require('./constants');
const myUtil = require('./util.js');
const logger = myUtil.getLogger();
const messageSender = require('./mqtt/message-sender');

const uuid = require('uuid/v4');

const democracy = {
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
// Public functions
// -----------------------------------------------------------------------------

function runDemocracy() {

    const electionLoopInterval = 10000;
    const timeWithoutLeader = 20000;
    const durationOfElection = 5000;
    const durationWithoutLeader = 25000;

    setInterval(function () {
        logger.trace('System status: %j', democracy);

        // Send 'alive' message
        // messageSender.sendMessage('skye/alive', { name: democracy.me });

        // If I'm the leader, inform the citizenry that I'm still alive
        if (democracy.me === democracy.leader) {
            logger.debug('Inform the citizenry that their leader is still alive');
            messageSender.sendMessage('skye/i-am-leader', { name: democracy.me });
        } else if (democracy.state === constants.STATES.LEADER_ELECTED) {
            // Check if leader is still alive
            if ((Date.now() - democracy.leaderAliveAt) > durationWithoutLeader) {
                logger.warn('Uh–oh, our esteemed leader died. Last seen ' + ((Date.now() - democracy.leaderAliveAt) / 1000) + ' seconds ago. Calling new election.');
                messageSender.sendMessage('skye/start-election', { name: democracy.me });
            } else {
                logger.debug('Leader last seen %s seconds ago', (((Date.now() - democracy.leaderAliveAt) / 1000)));
            }
        } else {
            logger.debug('I wonder who our leader is?');
        }

        if (democracy.state === constants.STATES.UNKNOWN) {
            if (Date.now() - democracy.timeLastEvent > timeWithoutLeader) {
                logger.info('We need to elect a leader');
                messageSender.sendMessage('skye/start-election', { name: democracy.me });
            }
        } else if (democracy.state === constants.STATES.VOTING) {
            if (Date.now() - democracy.electionCalledAt > durationOfElection) {

                if (democracy.votes && democracy.votes.length > 0) {

                    let highest = { name: '', randToken: -1 };

                    democracy.votes.forEach((vote) => {
                        if (vote.randToken > highest.randToken) {
                            highest = vote;
                        }
                    });

                    if (highest.name === democracy.me) {
                        logger.info('I won the election! \\o/');
                        democracy.state = constants.STATES.LEADER_ELECTED;
                        democracy.votes = [];

                        messageSender.sendMessage('skye/leader-elected', { name: democracy.me });
                    }
                }
            }
        }
    }, electionLoopInterval);
}

function amITheLeader() {
    return democracy.leader && democracy.leader === democracy.me;
}

// -----------------------------------------------------------------------------
// Public events
// -----------------------------------------------------------------------------

function onAlive(topic, mesgObj) {
    logger.debug('"%s" is still alive. Well done.', mesgObj.name);
}

function onStartElection(topic, mesgObj) {
    democracy.timeLastEvent = Date.now();
    democracy.electionCalledAt = Date.now();
    democracy.leader = null;
    democracy.leaderAliveAt = null;
    democracy.randToken = Math.random() * 1000;
    democracy.state = constants.STATES.START_ELECTION;
    democracy.votes = [];

    messageSender.sendMessage('skye/vote', { name: democracy.me, randToken: democracy.randToken });

}

function onVote(topic, mesgObj) {
    democracy.timeLastEvent = Date.now();
    democracy.state = constants.STATES.VOTING;

    logger.debug('Vote received from "%s" with token "%s"', mesgObj.name, mesgObj.randToken);

    democracy.votes.push(mesgObj);
}

function onLeaderElected(topic, mesgObj) {

    if (pCoupDetected(mesgObj)) {
        return;
    }

    democracy.timeLastEvent = Date.now();
    democracy.state = constants.STATES.LEADER_ELECTED;
    democracy.leader = mesgObj.name;
    democracy.leaderAliveAt = Date.now();

    if (democracy.me === mesgObj.name) {
        logger.debug('I (%s) am the new leader', mesgObj.name);
    } else {
        logger.debug('"%s" is the new leader', mesgObj.name);
    }
}

function onIAmLeader(topic, mesgObj) {

    if (pCoupDetected(mesgObj)) {
        return;
    }

    democracy.timeLastEvent = Date.now();
    democracy.leaderAliveAt = Date.now();

    if (democracy.state === constants.STATES.UNKNOWN) {
        democracy.state = constants.STATES.LEADER_ELECTED;
        democracy.leader = mesgObj.name;

        logger.debug('I\'m told "%s" is the leader', mesgObj.name);
    }

}

// -----------------------------------------------------------------------------
// Private functions
// -----------------------------------------------------------------------------

function pCoupDetected(mesgObj) {
    if (democracy.state === constants.STATES.LEADER_ELECTED) {
        if (democracy.leader && (democracy.leader !== mesgObj.name) && (democracy.leader === democracy.me)) {
            logger.warn('A coup is taking place. Calling new election.');
            democracy.leader = null; // Give up leadership in order to prevent work being done.
            logger.debug('Surrendering leadership prosition');
            messageSender.sendMessage('skye/start-election', { name: democracy.me });
            return true;
        }
    }

    return false;
}

// -----------------------------------------------------------------------------
// Module export
// -----------------------------------------------------------------------------

module.exports = {
    // functions
    runDemocracy,
    amITheLeader,

    // events
    onAlive,
    onStartElection,
    onVote,
    onLeaderElected,
    onIAmLeader
};
