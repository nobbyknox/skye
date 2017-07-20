const constants = require('./constants');
const myUtil = require('./util.js');
const logger = myUtil.getLogger();
const messageSender = require('./mqtt/message-sender');

const uuid = require('uuid/v4');

// TODO: Is this the best name for the state of the democracy?
const constitution = {
    me: uuid(),
    randToken: Math.random() * 1000,
    state: constants.STATES.UNKNOWN,
    leader: null,
    timeLastEvent: Date.now(), // TODO: Rename to lastEventAt, if it is still required
    electionCalledAt: null,
    leaderAliveAt: Date.now(),
    votes: []
};

// -----------------------------------------------------------------------------
// Public functions
// -----------------------------------------------------------------------------

function thrive() {

    const electionLoopInterval = 10000;
    const timeWithoutLeader = 20000;
    const durationOfElection = 5000;
    const durationWithoutLeader = 25000;

    setInterval(function () {
        logger.trace('System status: %j', constitution);

        // Send 'alive' message
        // messageSender.sendMessage('skye/alive', { name: democracy.me });

        // If I'm the leader, inform the citizenry that I'm still alive
        if (constitution.me === constitution.leader) {
            logger.debug('Inform the citizenry that their leader is still alive');
            messageSender.sendMessage('skye/i-am-leader', { name: constitution.me });
        } else if (constitution.state === constants.STATES.LEADER_ELECTED) {
            // Check if leader is still alive
            if ((Date.now() - constitution.leaderAliveAt) > durationWithoutLeader) {
                logger.warn('Uh–oh, our esteemed leader died. Last seen ' + ((Date.now() - constitution.leaderAliveAt) / 1000) + ' seconds ago. Calling new election.');
                messageSender.sendMessage('skye/start-election', { name: constitution.me });
            } else {
                logger.debug('Leader last seen %s seconds ago', (((Date.now() - constitution.leaderAliveAt) / 1000)));
            }
        } else {
            logger.debug('I wonder who our leader is?');
        }

        if (constitution.state === constants.STATES.UNKNOWN) {
            if (Date.now() - constitution.timeLastEvent > timeWithoutLeader) {
                logger.info('We need to elect a leader');
                messageSender.sendMessage('skye/start-election', { name: constitution.me });
            }
        } else if (constitution.state === constants.STATES.VOTING) {
            if (Date.now() - constitution.electionCalledAt > durationOfElection) {

                if (constitution.votes && constitution.votes.length > 0) {

                    let highest = { name: '', randToken: -1 };

                    constitution.votes.forEach((vote) => {
                        if (vote.randToken > highest.randToken) {
                            highest = vote;
                        }
                    });

                    if (highest.name === constitution.me) {
                        logger.info('I won the election! \\o/');
                        constitution.state = constants.STATES.LEADER_ELECTED;
                        constitution.votes = [];

                        messageSender.sendMessage('skye/leader-elected', { name: constitution.me });
                    }
                }
            }
        }
    }, electionLoopInterval);
}

function amITheLeader() {
    return constitution.leader && constitution.leader === constitution.me;
}

// -----------------------------------------------------------------------------
// Public events
// -----------------------------------------------------------------------------

function onAlive(topic, mesgObj) {
    logger.debug('"%s" is still alive. Well done.', mesgObj.name);
}

function onStartElection(topic, mesgObj) {
    constitution.timeLastEvent = Date.now();
    constitution.electionCalledAt = Date.now();
    constitution.leader = null;
    constitution.leaderAliveAt = null;
    constitution.randToken = Math.random() * 1000;
    constitution.state = constants.STATES.START_ELECTION;
    constitution.votes = [];

    messageSender.sendMessage('skye/vote', { name: constitution.me, randToken: constitution.randToken });

}

function onVote(topic, mesgObj) {
    constitution.timeLastEvent = Date.now();
    constitution.state = constants.STATES.VOTING;

    logger.debug('Vote received from "%s" with token "%s"', mesgObj.name, mesgObj.randToken);

    constitution.votes.push(mesgObj);
}

function onLeaderElected(topic, mesgObj) {

    if (pCoupDetected(mesgObj)) {
        return;
    }

    constitution.timeLastEvent = Date.now();
    constitution.state = constants.STATES.LEADER_ELECTED;
    constitution.leader = mesgObj.name;
    constitution.leaderAliveAt = Date.now();

    if (constitution.me === mesgObj.name) {
        logger.debug('I (%s) am the new leader', mesgObj.name);
    } else {
        logger.debug('"%s" is the new leader', mesgObj.name);
    }
}

function onIAmLeader(topic, mesgObj) {

    if (pCoupDetected(mesgObj)) {
        return;
    }

    constitution.timeLastEvent = Date.now();
    constitution.leaderAliveAt = Date.now();

    if (constitution.state === constants.STATES.UNKNOWN) {
        constitution.state = constants.STATES.LEADER_ELECTED;
        constitution.leader = mesgObj.name;

        logger.debug('I\'m told "%s" is the leader', mesgObj.name);
    }

}

// -----------------------------------------------------------------------------
// Private functions
// -----------------------------------------------------------------------------

function pCoupDetected(mesgObj) {
    if (constitution.state === constants.STATES.LEADER_ELECTED) {
        if (constitution.leader && (constitution.leader !== mesgObj.name) && (constitution.leader === constitution.me)) {
            logger.warn('A coup is taking place. Calling new election.');
            constitution.leader = null; // Give up leadership in order to prevent work being done.
            logger.debug('Surrendering leadership prosition');
            messageSender.sendMessage('skye/start-election', { name: constitution.me });
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
    thrive,
    amITheLeader,

    // events
    onAlive,
    onStartElection,
    onVote,
    onLeaderElected,
    onIAmLeader
};
