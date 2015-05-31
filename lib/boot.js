
if (!process.env.baseDir) {
   throw new Error('Missing env: baseDir');
}

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import bunyan from 'bunyan';
import yaml from 'js-yaml';
import lodash from 'lodash';
import redisLib from 'redis';

const logger = bunyan.createLogger({name: 'redix.boot', level: 'debug'});

const configDir = process.env.baseDir + '/config/';

global.redisPromisified = require('./redisPromisified');

require('../test/redis');

logger.info('redis', Object.keys(global.redisPromisified).toString());

const redixConfigFile = 'Redix.singleton.yaml';

const redixConfig = readRedixConfigSync(configDir, redixConfigFile);

import Redix from './Redix';

global.redix = new Redix(redixConfig);

readConfigDir(configDir);

function readRedixConfigSync(dir, file) {
   return yaml.safeLoad(fs.readFileSync(dir + '/' + file, 'utf8'));
}

function readConfigDir(dir) {
   let files = fs.readdirSync(dir);
   logger.info('readConfig', files);
   files.forEach(file => {
      if (file === redixConfigFile) {
      } else if (lodash.endsWith(file, '.yaml')) {
         let config = yaml.safeLoad(fs.readFileSync(dir + '/' + file, 'utf8'));
         config.processorName = path.basename(file, '.yaml');
         config.processorClass = file.split('.')[0];
         logger.info('readConfig', config.processorName, config);
         let Processor = require('../processors/' + config.processorClass);
         let instance = new Processor(config);
         global.redix.setProcessor(config.processorName, instance);
      }
   });
}
