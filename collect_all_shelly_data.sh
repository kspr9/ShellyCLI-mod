#!/bin/bash

# Set path to environment variables
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# Change to the script directory
cd /home/kspr/ShellyCLI-mod || {
   echo "Error: Cannot change to script directory"
   exit 1
}

# Log file for tracking execution
LOG_FILE="/home/kspr/ShellyCLI-mod/shelly_daily_fetch.log"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

echo "[$TIMESTAMP] Starting daily Shelly data collection" >> "$LOG_FILE"

# Run the heat pump script first
echo "[$TIMESTAMP] Running heat pump data collection" >> "$LOG_FILE"
./fetch_shelly_data_since_last_fetch.sh
RESULT=$?
if [ $RESULT -ne 0 ]; then
    echo "[$TIMESTAMP] Heat pump script failed with exit code $RESULT" >> "$LOG_FILE"
fi

# Run the monophase script for each channel
for CHANNEL in 0 1 2; do
    echo "[$TIMESTAMP] Running monophase data collection for channel $CHANNEL" >> "$LOG_FILE"
    CHANNEL=$CHANNEL ./fetch_shelly_monophase_data_since_last_fetch.sh
    RESULT=$?
    if [ $RESULT -ne 0 ]; then
        echo "[$TIMESTAMP] Monophase script failed for channel $CHANNEL with exit code $RESULT" >> "$LOG_FILE"
    fi
done

echo "[$TIMESTAMP] Daily Shelly data collection completed" >> "$LOG_FILE"
