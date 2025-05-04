#!/usr/bin/env node
import { Shelly3EM } from '@allterco/shelly/shelly-3em.js';
import { wsTransport } from '@allterco/transport/websocket.js'; // Assuming this path is correct relative to the script
import { Command, Argument, Option } from 'commander';
import cliProgress from 'cli-progress';
import { writeFileSync, unlinkSync } from 'fs';

const debug = process.env.DEBUG || 'none';

async function fetchData(
  startDate,
  endDate,
  { shelly: _shellyIP, output: _outputFileName }
) {
  // Initialize transport and device objects
  const _transport = new wsTransport(); // Uses the provided class definition
  const _testDev = new Shelly3EM(_transport);
  _transport.setDebug(debug);
  _testDev.setDebug(debug);

  // Declare progressBar variable here so it's accessible in finally block if needed
  let progressBar;
  let connected = false; // Flag to track connection status

  // Regular expression to match relative time periods (e.g., 5m, 1d, 2h)
  const _dRegEx = /^(\d+)([dDhHm])$/; // Added ^ and $ for stricter matching
  const _matchDayPeriod = startDate.match(_dRegEx);
  let _startDate, _endDate;

  try {
    // --- Date Parsing ---
    // Determine start and end dates based on input format
    if (_matchDayPeriod) { // Check if match exists (is not null)
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
        // Should not happen with the stricter regex
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
      // Determine end date: use provided endDate or default to now
      _endDate = endDate ? new Date(Date.parse(endDate)) : new Date();
      if (endDate && isNaN(_endDate.getTime())) {
          throw new Error(`Invalid end date format: "${endDate}". Use ISO 8601 format.`);
      }
    }

    // Validate date range
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

    // --- Data Fetching ---
    // Connect to the Shelly device
    console.log('Connecting to Shelly device...');
    await _transport.connect(_shellyIP);
    // Use the 'connected' property from wsTransport instance after connect resolves
    connected = _transport.connected;
    if (!connected) {
        // Although connect should throw on failure, double-check
        throw new Error('Transport failed to connect, but did not throw an error.');
    }
    console.log('Connected.');
    const _devInfo = await _testDev.getInfo();
    console.log(`Device Info: MAC=${_devInfo.mac}, Model=${_devInfo.model}, FW=${_devInfo.fw_id}`);


    // Setup progress bar
    progressBar = new cliProgress.SingleBar( // Assign to the outer scope variable
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

    // --- File Output ---
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
        } else {
             console.log('Output file does not exist, creating new one:', _outputFileName);
        }
    }

    console.log('Writing data to output file:', _outputFileName);
    // Write data to the output file
    _deviceDataResults.forEach((value) => {
      // Ensure all values are defined before joining (optional safety)
      const line = value.map(v => v ?? '').join(',');
      writeFileSync(_outputFileName, line + '\n', {
        flag: 'a+', // Append mode
      });
    });
    console.log(`Successfully wrote ${_deviceDataResults.length} records.`);

    // --- Results Summary ---
    console.log('\nResults of this fetch operation:');
    // Ensure _emDataIteratorResult.value exists before accessing properties
    if (_emDataIteratorResult && _emDataIteratorResult.value) {
        console.log('Device calls:', _emDataIteratorResult.value.deviceCalls ?? 'N/A');
        console.log('Number of items:', _emDataIteratorResult.value.itemsCount ?? 'N/A');
        console.log(
          'Average number of items in a response:',
          _emDataIteratorResult.value.averageItemsPerCall?.toFixed(2) ?? 'N/A' // Added rounding
        );
    } else if (_deviceDataResults.length === 0) {
         console.log('No data records found for the specified period.');
    }
     else {
        console.log('Final iterator state unavailable, but data was likely retrieved.');
    }
    console.log('Time elapsed in ms:', _endTimeMs - _startTimeMs);


  } catch (e) {
    // --- Error Handling ---
    console.error('\n--- ERROR ---');
    console.error('An error occurred during the fetch operation:');
    console.error(e.message || e); // Print error message or the whole object
    if (debug !== 'none' && e.stack) {
        console.error('Stack Trace:', e.stack); // Print stack trace if debug is enabled
    }
     // Stop progress bar if it was started and an error occurred
    if (progressBar && progressBar.isActive) { // Check if progressBar exists and is active
        progressBar.stop();
        console.error("Progress bar stopped due to error.");
    }
    // Set exit code to indicate failure
    process.exitCode = 1;

  } finally {
    // --- Cleanup ---
    console.log('\nFetch process cleanup...');
    // Use the 'connected' property which reflects the state after trying to connect.
    // Call the correct close() method if the transport might be connected.
    // The 'connected' flag might be true even if connect() failed mid-way,
    // so checking _transport._ws might be slightly safer, but we'll rely on the flag for now.
    if (_transport.connected) { // Check the property from the wsTransport instance
        try {
            console.log('Closing Shelly device connection...');
            _transport.close(); // FIX: Call the correct close() method
            console.log('Connection closed.');
        } catch (closeError) {
            // Log error during close, but don't necessarily overwrite exit code unless critical
             console.error('Error during connection close:', closeError.message || closeError);
             if (debug !== 'none' && closeError.stack) {
               console.error('Close Stack Trace:', closeError.stack);
             }
             // Decide if close error should cause script failure
             // if (!process.exitCode) process.exitCode = 1;
        }
    } else {
        console.log('No active connection to close or connection failed.');
    }
     console.log('Cleanup complete.');
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
    // Parse command line arguments using process.argv
    await cli.showHelpAfterError().parseAsync(process.argv);
    console.log(`Script finished with exit code ${process.exitCode || 0}.`);
  } catch (error) {
      // Catch errors during argument parsing (e.g., missing mandatory options)
      // Commander typically prints its own errors, but we catch to ensure proper exit
      console.error("CLI Parsing Error:", error.message);
      process.exitCode = 1; // Set exit code for CLI errors
  }
}

// Run main and handle exit codes based on process.exitCode
main()
  .then(() => {
    // process.exitCode will be set by fetchData on error, or remain undefined (0) on success
    process.exit(process.exitCode || 0); // Exit with the appropriate code
  })
  .catch((err) => {
    // Catch any unexpected unhandled promise rejections from main/fetchData
    console.error("--- UNHANDLED ERROR ---");
    console.error("An unexpected error occurred:", err.message || err);
     if (err.stack) {
        console.error('Stack Trace:', err.stack);
    }
    process.exit(1); // Exit with error code 1 for unhandled errors
  });
