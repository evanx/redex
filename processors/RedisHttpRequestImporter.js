
import fs from 'fs';
import path from 'path';
import bunyan from 'bunyan';
import yaml from 'js-yaml';
import lodash from 'lodash';

import app from '../lib/app';
import app from '../lib/Messages';

const log = global.bunyan.createLogger({name: 'RedisHttpRequestImporter', level: 'debug'});


export default class RedisHttpRequestImporter {

   constructor(config) {
      this.config = config;
      log.info('constructor', this.config);
   }

   dispatchMessage(message) {
   }

   processReply(reply) {
   }

}
