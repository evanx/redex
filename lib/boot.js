
if (!process.env.configDir) {
   throw new Error('Require environment variable: configDir');
}

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import bunyan from 'bunyan';
import yaml from 'js-yaml';
import lodash from 'lodash';

const logger = bunyan.createLogger({name: 'redix.boot', level: 'debug'});

const configDir = process.env.configDir;

global.redisPromised = require('./redisPromised');

logger.info('redis', Object.keys(global.redisPromised).toString());

const redixConfigFile = 'Redix.singleton.yaml';

const redixConfig = readYamlSync(configDir, redixConfigFile);

import Redix from './Redix';

global.redix = new Redix(redixConfig);

readConfigDir(configDir);

function readYamlSync(dir, file) {
   return yaml.safeLoad(fs.readFileSync(dir + '/' + file, 'utf8'));
}

function readConfigDir(dir) {
   fs.readdirSync(dir).forEach(file => {
      if (file === redixConfigFile) {
      } else if (lodash.endsWith(file, '.yaml')) {
         let config = readYamlSync(dir, file);
         config.processorName = path.basename(file, '.yaml');
         config.processorClass = file.split('.')[0];
         logger.info('readConfig', config.processorName, config);
         let Processor = require('../processors/' + config.processorClass);
         let instance = new Processor(config);
         global.redix.setProcessor(config.processorName, instance);
      }
   });
}
