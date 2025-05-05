#!/usr/bin/env node
import { readFileSync } from 'fs';
import { Command, Option } from 'commander';
import { Shelly1PM } from '../packages/shelly/shelly-1pm.js';
import { wsTransport } from '@allterco/transport/websocket.js';
import { mapToFile } from '../src/utils.js';
import {
  measurementFromDeviceEMStatus,
  measurementFromReferenceValues,
  mergeMeasurements,
} from '../src/model.js';

const DEBUG = process.env.DEBUG || 'none';

const _wait = async (_ms) => new Promise((resolve) => setTimeout(resolve, _ms));

async function read({ shelly: _shellyIP, output: _outputFileName, channel: _channel }) {
  console.log('Shelly 1PM device at ', _shellyIP);
  const _transport = new wsTransport();
  const _testDev = new Shelly1PM(_transport);
  _transport.setDebug(DEBUG);
  _testDev.setDebug(DEBUG);

  // Default to channel 0 if not specified
  const channelId = parseInt(_channel || 0);
  if (isNaN(channelId) || channelId < 0 || channelId > 2) {
    console.error('Invalid channel ID. Must be 0, 1, or 2');
    return;
  }

  try {
    await _transport.connect(_shellyIP);
    
    // Use getEM1 method to access the specific channel
    const em1 = _testDev.getEM1(channelId);
    const _status = await em1.getStatus();
    
    const _measurement = measurementFromDeviceEMStatus(_status.response);
    const _resultMap = new Map([
      ['mac', _testDev.info.mac],
      ['channel', channelId],
      ...Object.entries(_measurement),
    ]);
    console.table(_resultMap);
    if (_outputFileName) {
      mapToFile(_resultMap, _outputFileName);
      console.log('Readings written to', _outputFileName);
    }
  } catch (e) {
    console.error('Device read error', e);
    throw e;
  }
}

class ShellyCommand extends Command {
  createCommand(name) {
    const _command = new Command(name);
    _command.addOption(
      new Option('--shelly <shelly-ip>', 'Shelly IP address').env('SHELLY')
    );
    _command.addOption(
      new Option('-o --output [output-file]', 'File to output results to').env(
        'OUTPUT'
      )
    );
    _command.addOption(
      new Option('-c --channel [channel-id]', 'Channel ID (0, 1, or 2)').env(
        'CHANNEL'
      )
    );
    return _command;
  }
}

const cli = new ShellyCommand('read-1pm');

cli.command('read').description('Read device data').action(read);

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