#!/bin/bash
# Add full environment path
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# Find node executable
NODE_CMD=""

# Try the common commands first
for CMD in node nodejs
do
    if command -v $CMD &> /dev/null; then
        NODE_CMD=$(command -v $CMD)
        echo "Found Node.js at: $NODE_CMD"
        break
    fi
done

# If not found in PATH, try to find it in common locations
if [ -z "$NODE_CMD" ]; then
    # Check NVM installation
    NVM_NODE=$(find $HOME/.nvm -name node -type f -executable 2>/dev/null | head -n 1)
    if [ -n "$NVM_NODE" ]; then
        NODE_CMD=$NVM_NODE
        echo "Found Node.js in NVM at: $NODE_CMD"
    else
        # Check system locations
        SYS_NODE=$(find /usr /usr/local /opt -name node -type f -executable 2>/dev/null | head -n 1)
        if [ -n "$SYS_NODE" ]; then
            NODE_CMD=$SYS_NODE
            echo "Found Node.js in system at: $NODE_CMD"
        fi
    fi
fi

if [ -z "$NODE_CMD" ]; then
    echo "Error: Node.js not found. Please install Node.js or ensure it's in your PATH."
    exit 1
fi

# Full path to Shelly IP
SHELLY_IP="192.168.3.43"

# Channel to read (0, 1, or 2) - can be overridden by setting CHANNEL env var
CHANNEL=${CHANNEL:-0}

# Directory where log files are stored
LOG_DIR="."

# Current timestamp in ISO-8601 format
CURRENT_TIMESTAMP=$(date "+%Y-%m-%dT%H:%M:%S")

# Format filename with the current timestamp and channel
FILENAME="shelly_monophase_ch${CHANNEL}-${CURRENT_TIMESTAMP}.log"

# Find most recent log file for this channel
LATEST_LOG=$(find ${LOG_DIR} -name "shelly_monophase_ch${CHANNEL}-*.log" -type f | sort | tail -n 1)

if [ -n "$LATEST_LOG" ]; then
    # Extract timestamp directly from filename
    PREV_TIMESTAMP=$(basename "$LATEST_LOG" | sed "s/shelly_monophase_ch${CHANNEL}-\(.*\)\.log/\1/")

    echo "Found latest log: $LATEST_LOG"
    echo "Starting fetch from: $PREV_TIMESTAMP for channel ${CHANNEL}"

    # Fetch from previous timestamp until now
    SHELLY=$SHELLY_IP CHANNEL=$CHANNEL $NODE_CMD "$(dirname "$0")/bin/fetch-1pm.js" $PREV_TIMESTAMP --output "$FILENAME"
    echo "Data fetched and saved to $FILENAME"
else
    # If no previous log, fetch last 24 hours
    echo "No previous log found, fetching last 15 days for channel ${CHANNEL}"
    SHELLY=$SHELLY_IP CHANNEL=$CHANNEL $NODE_CMD "$(dirname "$0")/bin/fetch-1pm.js" 15d --output "$FILENAME"
    echo "Data fetched and saved to $FILENAME"
fi

