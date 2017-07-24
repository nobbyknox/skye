'use strict';

module.exports = {

    VERSION: '0.0.1',

    // Environment variable name that indicates operational environment
    ENVIRONMENT_VARIABLE: 'NODE_ENV',

    MQTT: {
        QOS: {
            FIRE_AND_FORGET: 0,
            AT_LEAST_ONCE: 1,
            AT_MOST_ONCE: 2
        },
        STATUS: {
            OKAY: 200,
            BAD_REQUEST: 400
        }
    },

    STATES: {
        UNKNOWN: 'unknown',
        START_ELECTION: 'start-election',
        VOTING: 'voting',
        LEADER_ELECTED: 'leader-elected'
    },

    TASKS: {
        PROCESS_IMAGES: 'process-images',
        SEND_NOTIFICATIONS: 'send-notifications'
    }

};
