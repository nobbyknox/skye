# Cheat Sheet

These commands help with injecting or simulating certain behavior.

```
# Vote
$ mosquitto_pub -u user -P secret -t 'skye/vote' -m '{ "name": "imposter", "randToken": 1000 }'

# Claim your victory
$ mosquitto_pub -u user -P secret -t 'skye/leader-elected' -m '{ "name": "imposter" }'

# Barge in
$ mosquitto_pub -u user -P secret -t 'skye/i-am-leader' -m '{ "name": "imposter" }'
```
