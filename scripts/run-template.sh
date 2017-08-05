#!/bin/bash

export LOGGER_NAME="skye"
export LOGGER_LEVEL="debug"
export LOGGER_SRC="true"
export MQTT_BROKER_HOST="127.0.0.1"
export MQTT_BROKER_USERNAME="null"
export MQTT_BROKER_PASSWORD="null"
export ENABLE_DELEGATOR="true"

clear
node lib/skye.js | ./node_modules/.bin/bunyan -L -o short --color

# mosquitto_pub -t skye/i-am-leader -m '{"name":"imposter"}'
# mosquitto_pub -t skye/send-notification -m '{}'
# mosquitto_pub -t skye/process-image -m '{}'
