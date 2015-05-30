

import fs from 'fs';
import path from 'path';
import bunyan from 'bunyan';
import yaml from 'js-yaml';
import lodash from 'lodash';
import redisLib from 'redis';

global.bunyan = bunyan;
global.redisClient = redisLib.createClient();
global.log = bunyan.createLogger({name: 'redix.main', level: 'debug'});

if (!process.env.baseDir) {
   throw new Error('Missing env: baseDir');
}

const configDir = process.env.baseDir + '/config/';

global.redis = require('./redisPromisified');

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
   log.info('readConfig', files);
   files.forEach(file => {
      if (file === redixConfigFile) {
      } else if (lodash.endsWith(file, '.yaml')) {
         let config = yaml.safeLoad(fs.readFileSync(dir + '/' + file, 'utf8'));
         config.processorName = path.basename(file, '.yaml');
         config.processorClass = file.split('.')[0];
         log.info('readConfig', config.processorName, config);
         let Processor = require('../processors/' + config.processorClass);
         let instance = new Processor(config);
         global.redix.setProcessor(config.processorName, instance);
      }
   });
}
