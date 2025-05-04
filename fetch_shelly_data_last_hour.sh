#!/bin/bash

PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# Get current date and time for filename in required format
CURRENT_DATE=$(date "+%y%m%d-%H%M")
FILENAME="soojuspump-${CURRENT_DATE}.log"

# Shelly device IP address
SHELLY_IP="192.168.3.44"

# Fetch 1 hour of data with the formatted filename
#SHELLY=$SHELLY_IP ./bin/fetch.js 1h --output $FILENAME

/usr/bin/node /home/kspr/shelly-cli-tools/bin/fetch.js 1h --output $FILENAME

#./bin/fetch.js 1h --shelly $SHELLY_IP --output $FILENAME

echo "Data fetched and saved to $FILENAME"
