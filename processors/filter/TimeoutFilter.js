
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';
import bunyan from 'bunyan';
import util from 'util';

const { redex } = RedexGlobal;

export default class TimeoutFilter {

   constructor(config) {
      this.config = config;
      assert(this.config.timeout, 'timeout');
      this.logger = bunyan.createLogger({
        name: config.processorName,
        level: RedexGlobal.loggerLevel
      });
      this.start();
   }

   start() {
     this.logger.info('started');
   }

   formatDuration(millis) {
     if (millis > 1000) {
       return '' + (millis/1000).toFixed(3) + 's';
     } else {
       return util.format('%dms', millis);
     }
   }

   async process(message, meta, route) {
      this.count += 1;
      let time = new Date().getTime();
      this.logger.debug('promise:', meta, route);
      return redex.dispatch(message, meta, route).then(reply => {
         let replyTime = new Date().getTime();
         let duration = replyTime - time;
         this.logger.debug('promise duration:', this.formatDuration(duration));
         assert(duration < this.config.timeout, 'Expired reply');
         return reply;
      });
   }
}
