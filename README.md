# Shelly Tools

Collection of tools used to interface, test and read Shelly devices. 

## Getting started

npm install

Given a standard node installation on a *nix or mac system make the files in `./bin` executable: 

```
chmod u+x ./bin/*.sh
chmod u+x ./bin/*.js
```

## Device Profiles

Shelly 3EM devices support two distinct profiles:

- **Triphase Profile (default)**: Uses a single energy meter (EM) which combines readings per phase and provides totals for all phases.
- **Monophase Profile**: Uses three separate energy meters (EM1), one per measured channel with separate databases (EM1Data).

## Running the tools

### Triphase Profile Tools (Original 3EM)

#### ./bin/fetch.js

Used to download data from a Pro 3EM device in triphase mode.

Usage info:

```
./bin/fetch.js
```

Example:

```
./bin/fetch.js
SHELLY=<shelly-ip> ./bin/fetch.js 1d
```

Download from the device at that IP address 1 day of data

#### ./bin/read.js

Read data from a triphase device, compare two devices, compare against reference values stored in json file

Usage:

Read data from a device
```
SHELLY=<shelly-ip> ./bin/read.js read
```

Example:
```
SHELLY=192.168.2.148 ./bin/read.js read
Shelly Pro 3EM device at  192.168.2.148
┌───────────────────┬───────────────┬────────────────┐
│ (iteration index) │      Key      │     Values     │
├───────────────────┼───────────────┼────────────────┤
│         0         │     'mac'     │ 'EC62608A33A0' │
│         1         │  'voltage_a'  │     235.3      │
│         2         │  'voltage_b'  │     235.3      │
│         3         │  'voltage_c'  │     235.3      │
│         4         │  'current_a'  │     0.286      │
│         5         │  'current_b'  │     0.036      │
│         6         │  'current_c'  │     0.228      │
│         7         │  'current_n'  │      null      │
│         8         │  'apower_a'   │      27.1      │
│         9         │  'apower_b'   │      3.1       │
│        10         │  'apower_c'   │       19       │
│        11         │ 'aprtpower_a' │      67.2      │
│        12         │ 'aprtpower_b' │      8.6       │
│        13         │ 'aprtpower_c' │      53.6      │
│        14         │    'pf_a'     │     -0.63      │
│        15         │    'pf_b'     │       -1       │
│        16         │    'pf_c'     │     -0.61      │
└───────────────────┴───────────────┴────────────────┘
```

Compare two devices
```
SHELLY=<shelly-ip> ETALON=<etalon-ip> ./bin/read.js compare
```


Compare against reference values in json
```
SHELLY=<shelly-ip> ETALON=<reference-json> ./bin/read.js compareref
```

Example:
```
➜ SHELLY=192.168.2.87 ETALON=./config/refs-50w-1pf.json ./bin/read.js compareref
┌─────────────┬───────────────────┬───────────┬────────┐
│   (index)   │     Reference     │  Device   │ Diff % │
├─────────────┼───────────────────┼───────────┼────────┤
│  voltage_a  │        230        │   234.1   │  1.78  │
│  voltage_b  │        230        │   234.6   │   2    │
│  voltage_c  │        230        │   234.4   │  1.91  │
│  current_a  │ 0.217391304347826 │   0.327   │ 50.42  │
│  current_b  │ 0.217391304347826 │   0.034   │ 84.36  │
│  current_c  │ 0.217391304347826 │   0.028   │ 87.12  │
│  current_n  │ 0.217391304347826 │   0.874   │ 302.04 │
│  apower_a   │        50         │   -66.6   │ 233.2  │
│  apower_b   │        50         │    2.5    │   95   │
│  apower_c   │        50         │    0.7    │  98.6  │
│ aprtpower_a │        50         │   70.7    │  41.4  │
│ aprtpower_b │        50         │    7.4    │  85.2  │
│ aprtpower_c │        50         │     6     │   88   │
│    pf_a     │         1         │ -0.946503 │ 194.65 │
│    pf_b     │         1         │ 0.368413  │ 63.16  │
│    pf_c     │         1         │ 0.066651  │ 93.33  │
└─────────────┴───────────────────┴───────────┴────────┘
```

#### Automated Data Collection (Triphase)

The repository contains two bash scripts for automated data collection from triphase Shelly devices:

1. **fetch_shelly_data_last_hour.sh**
   ```bash
   ./fetch_shelly_data_last_hour.sh
   ```
   Fetches the last hour of data from the Shelly device at 192.168.3.44 and saves it to a file with format `soojuspump-YYMMDD-HHMM.log`.

2. **fetch_shelly_data_since_last_fetch.sh**
   ```bash
   ./fetch_shelly_data_since_last_fetch.sh
   ```
   Finds the most recent log file and fetches all data since that timestamp from the Shelly device at 192.168.3.44. If no previous log is found, it fetches the last 24 hours of data.

### Monophase Profile Tools (1PM)

#### ./bin/fetch-1pm.js

Used to download data from a Shelly device in monophase mode.

Usage:

```bash
SHELLY=<shelly-ip> ./bin/fetch-1pm.js 1d
```

To specify which channel to read (default is channel 0):

```bash
SHELLY=<shelly-ip> CHANNEL=1 ./bin/fetch-1pm.js 1d
```

#### ./bin/read-1pm.js

Read data from a monophase device.

Usage:

```bash
SHELLY=<shelly-ip> ./bin/read-1pm.js read
```

To specify which channel to read (default is channel 0):

```bash
SHELLY=<shelly-ip> CHANNEL=1 ./bin/read-1pm.js read
```

#### Automated Data Collection (Monophase)

The repository includes a bash script for automated data collection from monophase Shelly devices:

**fetch_shelly_monophase_data_since_last_fetch.sh**
```bash
./fetch_shelly_monophase_data_since_last_fetch.sh
```

This script fetches data from the monophase Shelly device at 192.168.3.43 using channel 0 by default. It finds the most recent log file for the specified channel and fetches all data since that timestamp. If no previous log is found, it fetches the last 24 hours of data.

You can specify a different channel using the CHANNEL environment variable:

```bash
CHANNEL=1 ./fetch_shelly_monophase_data_since_last_fetch.sh
```

The data is saved to a file with the format `shelly_monophase_ch{CHANNEL}-{TIMESTAMP}.log`.

### ./bin/console.js

Simple tool that provides CLI for RPC to a Shelly device. Notifications and events are printed on the console.

Usage:

Start the console application and connect to a Shelly over WebSocket.
```
SHELLY=<shelly-ip> ./bin/console.js
```

Start the console application and connect to a Shelly over UDP. You need to configure UDP listen port on the Shelly device
```
SHELLY=<shelly-ip>:<shelly-udp-port> TRANSPORT=udp ./bin/console.js
```

## Environment

You can set an environment option that a command option will default to:
- `SHELLY=192.168.1.2 ./bin/fetch.js 1d`

or you can set the defaults in `./env/.env`
