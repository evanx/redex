

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

global.processors = new Map();

readConfigDir(process.env.baseDir + '/config/');

function readConfigDir(dir) {
   let files = fs.readdirSync(dir);
   log.info('readConfig', files);
   files.forEach(file => {
      if (lodash.endsWith(file, '.yaml')) {
         let config = yaml.safeLoad(fs.readFileSync(dir + '/' + file, 'utf8'));
         config.processorName = path.basename(file, '.yaml');
         config.processorClass = file.split('.')[0];
         log.info('readConfig', config.processorName, config);
         let Processor = require('../processors/' + config.processorClass);
         let instance = new Processor(config);
         global.processors.set(config.processorName, instance);
      }
   });
}
