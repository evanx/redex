
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redixrouter/LICENSE

global.redixLoggerLevel = 'debug';

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import bunyan from 'bunyan';
import yaml from 'js-yaml';
import lodash from 'lodash';

const logger = bunyan.createLogger({name: 'redix.boot', level: global.redixLoggerLevel});

assert(process.env.configDir, 'Require environment variable: configDir');

const configDir = process.env.configDir;
const redixConfigFile = 'Redix.singleton.yaml';
const redixConfig = readYamlSync(configDir, redixConfigFile);

if (!redixConfig) {
} else if (redixConfig.loggerLevel) {
   global.redixLoggerLevel = redixConfig.loggerLevel;
}

import Redix from './Redix';

global.redix = new Redix(redixConfig);

readConfigDir(configDir);

function readYamlSync(dir, file) {
   return yaml.safeLoad(fs.readFileSync(dir + '/' + file, 'utf8'));
}

function readConfigDir(dir) {
   fs.readdirSync(dir).forEach(file => {
      if (file === redixConfigFile) {
      } else if (lodash.endsWith(file, '.json')) {
      } else if (lodash.endsWith(file, '.yaml')) {
         let config = readYamlSync(dir, file);
         config.processorName = path.basename(file, '.yaml');
         config.processorClass = file.split('.')[0];
         configureProcessor(config);
      }
   });
}

function configureProcessor(config) {
   logger.info('configureProcessor', config.processorName, config);
   let Processor = require('../processors/' + config.processorClass);
   let instance = new Processor(config);
   global.redix.setProcessor(config.processorName, instance);
}
