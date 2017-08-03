#!/bin/bash

export logger_name="skye"
export logger_level="debug"
export logger_src="true"
export mqtt_broker_host="127.0.0.1"
export mqtt_broker_username="null"
export mqtt_broker_password="null"
export enable_delegator="false"

clear
node lib/skye.js | ./node_modules/.bin/bunyan -L -o short --color

# mosquitto_pub -t skye/i-am-leader -m '{"name":"imposter"}'
# mosquitto_pub -t skye/send-notification -m '{}'
# mosquitto_pub -t skye/process-image -m '{}'
