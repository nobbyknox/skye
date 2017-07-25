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
    votes: [],
    peers: []
};

// -----------------------------------------------------------------------------
// Public functions
// -----------------------------------------------------------------------------

function thrive() {

    const coordinationLoopInterval = 10000;
    const durationOfElection = 5000;
    const durationWithoutLeader = 25000;

    setInterval(function () {
        logger.trace('State of the nation: %j', stateOfTheNation);

        // Tell the world that I'm still alive, but only if we have a leader
        if (stateOfTheNation.state === constants.STATES.LEADER_ELECTED) {
            messageSender.sendMessage('skye/alive', { name: stateOfTheNation.me });
        }

        // If I'm the leader, inform the citizenry that I'm still alive
        if (stateOfTheNation.me === stateOfTheNation.leader) {
            logger.trace('Inform the citizenry that their leader is still alive');
            messageSender.sendMessage('skye/i-am-leader', { name: stateOfTheNation.me });
        } else if (stateOfTheNation.state === constants.STATES.LEADER_ELECTED) {
            // Check if leader is still alive
            if ((Date.now() - stateOfTheNation.leaderAliveAt) > durationWithoutLeader) {
                logger.warn('Uh–oh, our esteemed leader died. Last seen ' + ((Date.now() - stateOfTheNation.leaderAliveAt) / 1000) + ' seconds ago. Calling new election.');
                messageSender.sendMessage('skye/start-election', { name: stateOfTheNation.me });
            } else {
                logger.trace('Leader last seen %s seconds ago', (((Date.now() - stateOfTheNation.leaderAliveAt) / 1000)));
            }
        } else if (stateOfTheNation.state === constants.STATES.UNKNOWN) {
            logger.debug('I wonder who our leader is?');
        }

        if (stateOfTheNation.state === constants.STATES.UNKNOWN) {
            if (Date.now() - stateOfTheNation.leaderAliveAt > durationWithoutLeader) {
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
    }, coordinationLoopInterval);
}

function amITheLeader() {
    return stateOfTheNation.leader && stateOfTheNation.leader === stateOfTheNation.me;
}

function getStateOfTheNation() {
    return stateOfTheNation;
}

// -----------------------------------------------------------------------------
// Public events
// -----------------------------------------------------------------------------

function onAlive(topic, mesgObj) {
    logger.trace('"%s" is still alive.', mesgObj.name);

    let existingPeers = stateOfTheNation.peers.filter((item) => {
        return item.name === mesgObj.name;
    });

    if (existingPeers && existingPeers.length > 0) {
        existingPeers[0].lastSeenAt = Date.now();
    } else {
        stateOfTheNation.peers.push({ name: mesgObj.name, lastSeenAt: Date.now() });
    }
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

    logger.info('Vote received from "%s" with token "%s"', mesgObj.name, mesgObj.randToken);

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
        logger.info('I am the new leader - %s', mesgObj.name);
    } else {
        logger.info('"%s" is the new leader', mesgObj.name);
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

            // Give up leadership in order to stop this peer from doing more work
            stateOfTheNation.leader = null;
            logger.debug('Surrendering leadership position');

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
    getStateOfTheNation,

    // events
    onAlive,
    onStartElection,
    onVote,
    onLeaderElected,
    onIAmLeader
};
