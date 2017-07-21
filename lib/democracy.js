const constants = require('./constants');
const myUtil = require('./util.js');
const logger = myUtil.getLogger();
const messageSender = require('./mqtt/message-sender');

const uuid = require('uuid/v4');

const stateOfTheNation = {
    me: uuid(),
    randToken: Math.random() * 1000,
    state: constants.STATES.UNKNOWN,
    leader: null,
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
        logger.trace('System status: %j', stateOfTheNation);

        // Send 'alive' message
        // messageSender.sendMessage('skye/alive', { name: stateOfTheNation.me });

        // If I'm the leader, inform the citizenry that I'm still alive
        if (stateOfTheNation.me === stateOfTheNation.leader) {
            logger.debug('Inform the citizenry that their leader is still alive');
            messageSender.sendMessage('skye/i-am-leader', { name: stateOfTheNation.me });
        } else if (stateOfTheNation.state === constants.STATES.LEADER_ELECTED) {
            // Check if leader is still alive
            if ((Date.now() - stateOfTheNation.leaderAliveAt) > durationWithoutLeader) {
                logger.warn('Uh–oh, our esteemed leader died. Last seen ' + ((Date.now() - stateOfTheNation.leaderAliveAt) / 1000) + ' seconds ago. Calling new election.');
                messageSender.sendMessage('skye/start-election', { name: stateOfTheNation.me });
            } else {
                logger.debug('Leader last seen %s seconds ago', (((Date.now() - stateOfTheNation.leaderAliveAt) / 1000)));
            }
        } else if (stateOfTheNation.state === constants.STATES.UNKNOWN) {
            logger.debug('I wonder who our leader is?');
        }

        if (stateOfTheNation.state === constants.STATES.UNKNOWN) {
            if (Date.now() - stateOfTheNation.leaderAliveAt > timeWithoutLeader) {
                logger.info('We need to elect a leader');
                messageSender.sendMessage('skye/start-election', { name: stateOfTheNation.me });
            }
        } else if (stateOfTheNation.state === constants.STATES.VOTING) {
            if (Date.now() - stateOfTheNation.electionCalledAt > durationOfElection) {

                if (stateOfTheNation.votes && stateOfTheNation.votes.length > 0) {

                    let highest = { name: '', randToken: -1 };

                    stateOfTheNation.votes.forEach((vote) => {
                        if (vote.randToken > highest.randToken) {
                            highest = vote;
                        }
                    });

                    if (highest.name === stateOfTheNation.me) {
                        logger.info('I won the election! \\o/');
                        stateOfTheNation.state = constants.STATES.LEADER_ELECTED;
                        stateOfTheNation.votes = [];

                        messageSender.sendMessage('skye/leader-elected', { name: stateOfTheNation.me });
                    }
                }
            }
        }
    }, electionLoopInterval);
}

function amITheLeader() {
    return stateOfTheNation.leader && stateOfTheNation.leader === stateOfTheNation.me;
}

// -----------------------------------------------------------------------------
// Public events
// -----------------------------------------------------------------------------

function onAlive(topic, mesgObj) {
    logger.debug('"%s" is still alive. Well done.', mesgObj.name);
}

function onStartElection(topic, mesgObj) {
    stateOfTheNation.electionCalledAt = Date.now();
    stateOfTheNation.leader = null;
    stateOfTheNation.leaderAliveAt = null;
    stateOfTheNation.randToken = Math.random() * 1000;
    stateOfTheNation.state = constants.STATES.START_ELECTION;
    stateOfTheNation.votes = [];

    messageSender.sendMessage('skye/vote', { name: stateOfTheNation.me, randToken: stateOfTheNation.randToken });

}

function onVote(topic, mesgObj) {
    stateOfTheNation.state = constants.STATES.VOTING;

    logger.debug('Vote received from "%s" with token "%s"', mesgObj.name, mesgObj.randToken);

    stateOfTheNation.votes.push(mesgObj);
}

function onLeaderElected(topic, mesgObj) {

    if (pCoupDetected(mesgObj)) {
        return;
    }

    stateOfTheNation.state = constants.STATES.LEADER_ELECTED;
    stateOfTheNation.leader = mesgObj.name;
    stateOfTheNation.leaderAliveAt = Date.now();

    if (stateOfTheNation.me === mesgObj.name) {
        logger.debug('I (%s) am the new leader', mesgObj.name);
    } else {
        logger.debug('"%s" is the new leader', mesgObj.name);
    }
}

function onIAmLeader(topic, mesgObj) {

    if (pCoupDetected(mesgObj)) {
        return;
    }

    stateOfTheNation.leaderAliveAt = Date.now();

    if (stateOfTheNation.state === constants.STATES.UNKNOWN) {
        stateOfTheNation.state = constants.STATES.LEADER_ELECTED;
        stateOfTheNation.leader = mesgObj.name;

        logger.debug('I\'m told "%s" is the leader', mesgObj.name);
    }

}

// -----------------------------------------------------------------------------
// Private functions
// -----------------------------------------------------------------------------

function pCoupDetected(mesgObj) {
    if (stateOfTheNation.state === constants.STATES.LEADER_ELECTED) {
        if (stateOfTheNation.leader && (stateOfTheNation.leader !== mesgObj.name) && (stateOfTheNation.leader === stateOfTheNation.me)) {
            logger.warn('A coup is taking place. Calling new election.');
            stateOfTheNation.leader = null; // Give up leadership in order to prevent work being done.
            logger.debug('Surrendering leadership prosition');
            messageSender.sendMessage('skye/start-election', { name: stateOfTheNation.me });
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
