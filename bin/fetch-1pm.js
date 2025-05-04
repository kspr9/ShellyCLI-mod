#!/usr/bin/env node
import { Shelly1PM } from '../packages/shelly/shelly-1pm.js';
import { wsTransport } from '@allterco/transport/websocket.js';
import { Command, Argument, Option } from 'commander';
import cliProgress from 'cli-progress';
import { writeFileSync } from 'fs';

const debug = process.env.DEBUG || 'none';

async function fetchData(
  startDate,
  endDate,
  { shelly: _shellyIP, output: _outputFileName, channel: _channel }
) {
  const _transport = new wsTransport();
  const _testDev = new Shelly1PM(_transport);
  _transport.setDebug(debug);
  _testDev.setDebug(debug);

  // Default to channel 0 if not specified
  const channelId = parseInt(_channel || 0);
  if (isNaN(channelId) || channelId < 0 || channelId > 2) {
    console.error('Invalid channel ID. Must be 0, 1, or 2');
    return;
  }

  const _dRegEx = /([0-9]*)([d,D,h,H,m])/;
  const _matchDayPeriod = startDate.match(_dRegEx);
  let _startDate, _endDate;
  if (_matchDayPeriod && _matchDayPeriod.length > 1) {
    _endDate = new Date();
    _startDate = new Date();
    if (_matchDayPeriod[2].toLowerCase() == 'd') {
      _startDate.setDate(_endDate.getDate() - parseInt(_matchDayPeriod[1]));
    } else if (_matchDayPeriod[2].toLowerCase() == 'h') {
      _startDate.setHours(_endDate.getHours() - parseInt(_matchDayPeriod[1]));
    } else if (_matchDayPeriod[2].toLowerCase() == 'm') {
      _startDate.setMinutes(_endDate.getMinutes() - parseInt(_matchDayPeriod[1]));
    }
  } else {
    _startDate = new Date(Date.parse(startDate));
    _endDate = endDate ? new Date(endDate) : new Date();
  }

  const _startTS = _startDate.getTime();
  const _endTS = _endDate.getTime();
  console.log('Shelly 1PM device at ', _shellyIP);
  console.log(
    'Reading device data from channel', channelId,
    'for period', new Date(_startTS),
    'to', new Date(_endTS),
    '\n'
  );
  let _emDataIteratorResult = null;

  try {
    await _transport.connect(_shellyIP);
    const _devInfo = await _testDev.getInfo();
    const progressBar = new cliProgress.SingleBar(
      {},
      cliProgress.Presets.shades_classic
    );
    progressBar.start(100, 0);

    const msToS = (ms) => Math.round(ms / 1000);
    // Use the specific channel's EM1Data instance
    const em1Data = _testDev.getEM1Data(channelId);
    const _resultIterator = em1Data.getPeriodIterator(
      msToS(_startTS),
      msToS(_endTS),
      channelId
    );

    let _deviceDataResults = [];

    const _startTimeMs = Date.now();
    do {
      _emDataIteratorResult = await _resultIterator.next();
      if (_emDataIteratorResult.done) {
        break;
      }

      _deviceDataResults.push([
        _emDataIteratorResult.value.ts,
        ..._emDataIteratorResult.value.record,
      ]);

      progressBar.update(_emDataIteratorResult.value.percent);
    } while (_emDataIteratorResult.done == false);
    const _endTimeMs = Date.now();
    
    progressBar.update(100);

    console.log('\n');
    
    _outputFileName = _outputFileName || `${_devInfo.mac}_ch${channelId}.log`;
    _outputFileName = _outputFileName.replace('[mac]', _devInfo.mac)
    console.log('Writing output file', _outputFileName);
    _deviceDataResults.forEach((value) => {
      writeFileSync(_outputFileName, value.join(',') + '\n', {
        flag: 'a+',
      });
    });

    console.log('Results of this fetch operation: ');
    console.log('Device calls: ', _emDataIteratorResult.value.deviceCalls);
    console.log('Time elapsed in ms: ', _endTimeMs - _startTimeMs);
    console.log('Number of items: ', _emDataIteratorResult.value.itemsCount);
    console.log(
      'Average number of items in a response: ',
      _emDataIteratorResult.value.averageItemsPerCall
    );
  } catch (e) {
    console.error('Could not fetch data. Check connection to device.', e);
  } finally {
    console.log('Fetch complete.');
  }
}

const cli = new Command('fetch-1pm');

cli
  .argument(
    '<start-date>',
    'Start datetime of the period or [1,2,3][d,h,m] e.g. 1d means one day of data, 2h means 2 hours of data, 3m - three minutes'
  )
  .argument('[end-date]')
  .addOption(
    new Option('--shelly <shelly-ip>', 'Shelly IP address').env('SHELLY')
  )
  .addOption(
    new Option('-c --channel [channel-id]', 'Channel ID (0, 1, or 2)').env('CHANNEL')
  )
  .option(
    '-o, --output [filename]',
    'filename for output, defaults to <device-mac>_ch<channel>.log'
  )
  .action(fetchData)
  .addHelpText(
    'after',
    `
Example date format:
  2022-08-09T14:00:00`
  );

async function main() {
  return await cli.showHelpAfterError().parseAsync();
}

main()
  .then((_) => {
    process.exit(0);
  })
  .catch((_) => {
    process.exit(-1);
  });