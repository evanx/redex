
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redixrouter/LICENSE

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import bunyan from 'bunyan';
import yaml from 'js-yaml';
import lodash from 'lodash';

global.redixLoggerLevel = process.env.LOGGER_LEVEL || 'debug';

const logger = bunyan.createLogger({name: 'redix.boot', level: global.redixLoggerLevel});

assert(process.env.configDir || process.env.baseDir, 'Require environment variable: configDir, or baseDir');

var baseDir = process.env.baseDir;
var configDir = process.env.configDir;
if (!baseDir) {
   baseDir = path.dirname(configDir);
} else if (!configDir) {
   configDir = baseDir.replace(/\/$/g, '') + '/config';
}

const redixConfigFile = 'Redix.singleton.yaml';
const redixConfig = readYamlSync(configDir, redixConfigFile);

Object.assign(redixConfig, { configDir, baseDir });

if (!redixConfig) {
} else if (redixConfig.loggerLevel) {
   global.redixLoggerLevel = redixConfig.loggerLevel;
}

import Redix from './Redix';

global.redix = new Redix(redixConfig);

init();

function init() {
   let configs = readConfigDir(configDir);
   logger.info('configs', configs.map(config => config.processorName));
   configs.forEach(config => {
      logger.info('configs', config.processorName);
      configureProcessor(decorateProcessorConfig(config));
   });
}

function decorateProcessorConfig(config) {
   if (!config.loggerLevel) {
      config.loggerLevel = global.redixLoggerLevel;
   }
   return config;
}

function configureProcessor(config) {
   logger.info('configureProcessor', config.processorName, config);
   let Processor = require('../processors/' + config.processorClass);
   let instance;
   if (/^[A-Z]/.test(config.processorName)) {
      instance = new Processor(config);
   } else {
      instance = Processor(config);
   }
   global.redix.setProcessor(config.processorName, instance);
}

function readYamlSync(dir, file) {
   return yaml.safeLoad(fs.readFileSync(dir + '/' + file, 'utf8'));
}

function readConfigDir(dir) {
   return fs.readdirSync(dir).filter(file => {
      if (file === redixConfigFile) {
      } else if (lodash.endsWith(file, '.json')) {
      } else if (lodash.endsWith(file, '.yaml')) {
         return true;
      }
   }).map(file => {
      let config = readYamlSync(dir, file);
      config.processorName = path.basename(file, '.yaml');
      config.processorClass = file.split('.')[0];
      if (!config.startup) {
         if (config.type === 'importer') {
            config.startup = 80;
         } else if (config.type === 'exporter') {
            config.startup = 20;
         } else {
            config.startup = 50;
         }
      }
      return config;
   }).sort((a, b) => a.startup > b.startup);
}
