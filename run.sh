#!/bin/bash

export logger_name="skye"
export logger_level="debug"
export logger_src="true"
export mqtt_broker_host="172.0.0.20"
export mqtt_broker_username="null"
export mqtt_broker_password="null"

clear; npm run start:no-reload
