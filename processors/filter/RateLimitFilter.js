
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';
import bunyan from 'bunyan';
import util from 'util';

export default class RateLimitFilter {

   constructor(config) {
      redex.assertNumber(config.limit, 'limit');
      redex.assertNumber(config.periodMillis, 'periodMillis');
      this.config = config;
      this.logger = bunyan.createLogger({
        name: config.processorName,
        level: global.redexLoggerLevel
      });
      this.start();
   }

   start() {
     this.count = 0;
     if (this.config.periodMillis) {
        setTimeout(() => this.resetCount(), this.periodMillis);
     }
     this.logger.info('started');
   }

   formatExceeded() {
      return util.format('%d exceeds %d in %sms',
         this.count, this.config.limit, this.config.periodMillis);
   }

   resetCount() {
      this.logger.debug('resetCount', this.count);
      this.count = 0;
   }

   async process(message, meta, route) {
      this.logger.debug('promise:', meta, route);
      this.count += 1;
      assert(this.count <= this.config.limit, 'Limit exceeded: ' + this.formatExceeded());
      return redex.dispatch(message, meta, route).then(reply => {
         this.logger.debug('promise reply:', meta);
         return reply;
      });
   }
}
