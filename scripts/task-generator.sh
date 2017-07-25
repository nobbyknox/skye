#!/bin/bash

taskNum=0

while [ true ]; do
    taskNum=`shuf -i 0-1 -n 1`

    if [ $taskNum = 0 ]; then
        echo "Requesting image processing"
        mosquitto_pub -t skye/process-image -m '{}'
    elif [ $taskNum = 1 ]; then
        echo "Requesting message delivery"
        mosquitto_pub -t skye/send-notification -m '{}'
    else
        echo "Task number $taskNum is not supported"
    fi

    sleep 2;
done
