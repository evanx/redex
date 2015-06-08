
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redixrouter/LICENSE

import assert from 'assert';
import bunyan from 'bunyan';
import util from 'util';

export default class TimeoutFilter {

   constructor(config) {
      this.config = config;
      assert(this.config.timeout);
      this.logger = bunyan.createLogger({
        name: config.processorName,
        level: global.redixLoggerLevel
      });
      this.start();
   }

   start() {
     this.logger.info('started');
   }

   formatDuration(millis) {
     if (millis > 1000) {
       let seconds = millis/1000;
       return '' + seconds.toFixed(3) + 's';
     } else {
       return util.format('%dms', millis);
     }
   }

   async processMessage(message, meta, route) {
      this.count += 1;
      let time = new Date().getTime();
      this.logger.debug('processMessage:', meta, route);
      return redix.dispatchMessage(message, meta, route).then(reply => {
         let replyTime = new Date().getTime();
         let duration = replyTime - time;
         this.logger.debug('processMessage duration:', this.formatDuration(duration));
         assert(duration < this.config.timeout, 'Expired reply');
         return reply;
      });
   }
}
