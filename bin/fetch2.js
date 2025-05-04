#!/usr/bin/env node
import { Shelly3EM } from '@allterco/shelly/shelly-3em.js';
import { wsTransport } from '@allterco/transport/websocket.js';
import { Command, Argument, Option } from 'commander';
import cliProgress from 'cli-progress';
import { writeFileSync, unlinkSync } from 'fs'; // Added unlinkSync to potentially clear old files

const debug = process.env.DEBUG || 'none';

async function fetchData(
  startDate,
  endDate,
  { shelly: _shellyIP, output: _outputFileName }
) {
  const _transport = new wsTransport();
  const _testDev = new Shelly3EM(_transport);
  _transport.setDebug(debug);
  _testDev.setDebug(debug);

  // Regular expression to match relative time periods (e.g., 5m, 1d, 2h)
  const _dRegEx = /^(\d+)([dDhHm])$/; // Added ^ and $ for stricter matching
  const _matchDayPeriod = startDate.match(_dRegEx);
  let _startDate, _endDate;

  try {
    // Determine start and end dates based on input format
    if (_matchDayPeriod) { // FIX: Check if match exists (is not null) instead of length
      console.log('Detected relative start date:', startDate);
      _endDate = new Date();
      _startDate = new Date();
      const value = parseInt(_matchDayPeriod[1]);
      const unit = _matchDayPeriod[2].toLowerCase();

      if (unit === 'd') {
        _startDate.setDate(_endDate.getDate() - value);
      } else if (unit === 'h') {
        _startDate.setHours(_endDate.getHours() - value);
      } else if (unit === 'm') {
        _startDate.setMinutes(_endDate.getMinutes() - value);
      } else {
        // Should not happen with the stricter regex, but good practice
        throw new Error(`Invalid relative time unit: ${unit}`);
      }
    } else {
      // Assume absolute date format
      console.log('Parsing absolute start date:', startDate);
      _startDate = new Date(Date.parse(startDate));
      // Check if parsing was successful
      if (isNaN(_startDate.getTime())) {
          throw new Error(`Invalid start date format: "${startDate}". Use ISO 8601 format (e.g., YYYY-MM-DDTHH:mm:ss) or relative format (e.g., 5m, 1d).`);
      }
      _endDate = endDate ? new Date(Date.parse(endDate)) : new Date();
      if (endDate && isNaN(_endDate.getTime())) {
          throw new Error(`Invalid end date format: "${endDate}". Use ISO 8601 format.`);
      }
    }

    // Ensure start date is before end date
    if (_startDate >= _endDate) {
        throw new Error(`Start date (${_startDate.toISOString()}) must be before end date (${_endDate.toISOString()}).`);
    }

    const _startTS = _startDate.getTime();
    const _endTS = _endDate.getTime();
    console.log('Shelly Pro 3EM device at ', _shellyIP);
    console.log(
      'Reading device data from ',
      _startDate.toISOString(), // Use ISO string for clarity
      'to ',
      _endDate.toISOString(), // Use ISO string for clarity
      '\n'
    );
    let _emDataIteratorResult = null;

    // Connect to the Shelly device
    await _transport.connect(_shellyIP);
    const _devInfo = await _testDev.getInfo();

    // Setup progress bar
    const progressBar = new cliProgress.SingleBar(
      {},
      cliProgress.Presets.shades_classic
    );
    console.log('Fetching data...');
    progressBar.start(100, 0);

    // Helper function to convert milliseconds to seconds
    const msToS = (ms) => Math.round(ms / 1000);

    // Get the data iterator for the specified period
    const _resultIterator = _testDev.EMData.getPeriodIterator(
      msToS(_startTS),
      msToS(_endTS)
    );

    let _deviceDataResults = [];
    const _startTimeMs = Date.now();

    // Iterate through the data results
    do {
      _emDataIteratorResult = await _resultIterator.next();
      if (_emDataIteratorResult.done) {
        break;
      }

      // Store the timestamp and data record
      _deviceDataResults.push([
        _emDataIteratorResult.value.ts,
        ..._emDataIteratorResult.value.record,
      ]);

      // Update progress bar
      progressBar.update(_emDataIteratorResult.value.percent);
    } while (_emDataIteratorResult.done == false);

    const _endTimeMs = Date.now();
    progressBar.update(100); // Ensure progress bar completes
    progressBar.stop(); // Stop the progress bar

    console.log('\n');

    // Determine output filename
    _outputFileName = _outputFileName || `${_devInfo.mac}.log`; // Use template literal
    _outputFileName = _outputFileName.replace('[mac]', _devInfo.mac);

    // Optional: Clear the output file before writing new data
    try {
        unlinkSync(_outputFileName);
        console.log('Cleared existing output file:', _outputFileName);
    } catch (err) {
        if (err.code !== 'ENOENT') { // Ignore if file doesn't exist
            console.warn('Could not clear output file:', err.message);
        }
    }


    console.log('Writing output file:', _outputFileName);
    // Write data to the output file
    _deviceDataResults.forEach((value) => {
      // Ensure all values are defined before joining (optional safety)
      const line = value.map(v => v ?? '').join(',');
      writeFileSync(_outputFileName, line + '\n', {
        flag: 'a+', // Append mode
      });
    });

    console.log('\nResults of this fetch operation:');
    // Ensure _emDataIteratorResult.value exists before accessing properties
    if (_emDataIteratorResult && _emDataIteratorResult.value) {
        console.log('Device calls:', _emDataIteratorResult.value.deviceCalls ?? 'N/A');
        console.log('Number of items:', _emDataIteratorResult.value.itemsCount ?? 'N/A');
        console.log(
          'Average number of items in a response:',
          _emDataIteratorResult.value.averageItemsPerCall ?? 'N/A'
        );
    } else {
        console.log('No data retrieved or final iterator state unavailable.');
    }
    console.log('Time elapsed in ms:', _endTimeMs - _startTimeMs);


  } catch (e) {
    // FIX: Use the caught error object 'e' instead of undefined 'reason'
    console.error('\nError during fetch operation:');
    console.error(e.message || e); // Print error message or the whole object
    if (debug !== 'none' && e.stack) {
        console.error(e.stack); // Print stack trace if debug is enabled
    }
     // Stop progress bar if it was started and an error occurred
    if (typeof progressBar !== 'undefined' && progressBar.isActive) {
        progressBar.stop();
    }
  } finally {
    console.log('Fetch process complete.');
    // Ensure transport is disconnected
    if (_transport.isConnected()) {
      console.log('Disconnecting from Shelly device...');
      await _transport.disconnect();
    }
  }
}

// --- CLI Setup (Commander) ---
const cli = new Command('fetch');

cli
  .addArgument(new Argument( // Use Argument class for better definition
    '<start-date>',
    'Start datetime (ISO 8601 format like YYYY-MM-DDTHH:mm:ss) or relative period (e.g., 1d, 2h, 3m)'
  ))
  .addArgument(new Argument( // Use Argument class
    '[end-date]',
    'End datetime (ISO 8601 format). Defaults to now if start-date is absolute.'
  ).argOptional()) // Mark as optional
  .addOption(
    new Option('--shelly <shelly-ip>', 'Shelly device IP address or hostname')
        .env('SHELLY') // Read from SHELLY environment variable
        .makeOptionMandatory() // Make Shelly IP mandatory
  )
  .option(
    '-o, --output [filename]',
    'Output filename. Use "[mac]" placeholder for device MAC. Defaults to "<device-mac>.log".',
    '[mac].log' // Default value set here
  )
  .action(fetchData) // Action handler
  .addHelpText(
    'after',
    `
Examples:
  # Fetch last 5 minutes of data from Shelly at 192.168.1.100
  SHELLY=192.168.1.100 node fetch.js 5m

  # Fetch data from 2025-05-03 01:00:00 to now
  SHELLY=192.168.1.100 node fetch.js "2025-05-03T01:00:00"

  # Fetch data for a specific period and save to a custom file
  SHELLY=192.168.1.100 node fetch.js "2025-05-01T00:00:00" "2025-05-02T00:00:00" -o my_shelly_data.csv

  # Fetch last 2 days of data, outputting to <MAC_ADDRESS>.log
  SHELLY=192.168.1.100 node fetch.js 2d --output "[mac].log"
`
  );

// --- Main execution ---
async function main() {
  try {
    await cli.showHelpAfterError().parseAsync(process.argv); // Use process.argv
  } catch (error) {
      // Commander might throw errors for invalid options/args before the action is called
      console.error("CLI Error:", error.message);
      process.exit(1); // Exit with error code
  }
}

// Run main and handle exit codes
main()
  .then(() => {
    // process.exit(0); // Let Node exit naturally unless there was an error
  })
  .catch((err) => {
    // Catch any unhandled promise rejections from main/fetchData
    console.error("Unhandled error:", err);
    process.exit(1); // Exit with error code
  });
