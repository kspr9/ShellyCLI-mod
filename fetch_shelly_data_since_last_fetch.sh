#!/bin/bash
# Add full environment path
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# Full path to Shelly IP
SHELLY_IP="192.168.3.44"

# Directory where log files are stored
LOG_DIR="."

# Current timestamp in ISO-8601 format
CURRENT_TIMESTAMP=$(date "+%Y-%m-%dT%H:%M:%S")

# Format filename with the current timestamp
FILENAME="soojuspump-${CURRENT_TIMESTAMP}.log"

# Find most recent log file
LATEST_LOG=$(find ${LOG_DIR} -name "soojuspump-*.log" -type f | sort | tail -n 1)

if [ -n "$LATEST_LOG" ]; then
    # Extract timestamp directly from filename (new format: soojuspump-TIMESTAMP.log)
    PREV_TIMESTAMP=$(basename "$LATEST_LOG" | sed 's/soojuspump-\(.*\)\.log/\1/')

    echo "Found latest log: $LATEST_LOG"
    echo "Starting fetch from: $PREV_TIMESTAMP"

    # Fetch from previous timestamp until now
    SHELLY=$SHELLY_IP /usr/bin/node /home/kspr/shelly-cli-tools/bin/fetch4.js $PREV_TIMESTAMP --output "$FILENAME"
else
    # If no previous log, fetch last 24 hours
    echo "No previous log found, fetching last 24 hours"
    SHELLY=$SHELLY_IP /usr/bin/node /home/kspr/shelly-cli-tools/bin/fetch4.js 24h --output "$FILENAME"
fi

echo "Data fetched and saved to $FILENAME"
