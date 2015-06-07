
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redixrouter/LICENSE

import assert from 'assert';
import bunyan from 'bunyan';
import util from 'util';

const logger = bunyan.createLogger({name: 'RateLimitFilter', level: global.redixLoggerLevel});

export default class RateLimitFilter {

   constructor(config) {
      redix.assertNumber(config.limit, 'limit');
      redix.assertNumber(config.periodMillis, 'periodMillis');
      this.config = config;
      logger.info('constructor', this.config);
      this.count = 0;
      if (this.config.periodMillis) {
         setTimeout(() => this.resetCount(), this.periodMillis);
      }
   }

   formatExceeded() {
      return util.format('%d exceeds %d in %sms',
         this.count, this.config.limit, this.config.periodMillis);
   }

   resetCount() {
      logger.debug('resetCount', this.count);
      this.count = 0;
   }

   async processMessage(message, meta, route) {
      logger.debug('processMessage:', meta, route);
      this.count += 1;
      assert(this.count <= this.config.limit, 'Limit exceeded: ' + formatExceeded());
      return redix.dispatchMessage(message, meta, route);
   }
}
