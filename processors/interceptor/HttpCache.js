
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redixrouter/LICENSE

import assert from 'assert';
import bunyan from 'bunyan';
import util from 'util';

import Redis from '../lib/Redis';

export default class HttpCache {

   constructor(config) {
      this.config = config;
      assert(config.redisKey, 'redisKey');
      assert(config.expiry, 'expiry');
      this.redis = new Redis();
      this.logger = bunyan.createLogger({
        name: config.processorName,
        level: global.redixLoggerLevel
      });
      this.start();
   }


   start() {
     this.logger.info('started');
   }

   async process(message, meta, route) {
      return redix.dispatch(message, meta, route).then(reply => {

         return reply;
      });
   }
}
