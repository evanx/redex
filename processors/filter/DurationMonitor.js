
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';
import bunyan from 'bunyan';
import util from 'util';

export default class DurationMonitor {

   constructor(config) {
      this.config = config;
      this.logger = bunyan.createLogger({
        name: config.processorName,
        level: global.redexLoggerLevel
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

   async process(message, meta, route) {
      this.count += 1;
      let time = new Date().getTime();
      return redex.dispatch(message, meta, route).then(reply => {
         let replyTime = new Date().getTime();
         let duration = replyTime - time;
         this.logger.debug('duration:', this.formatDuration(duration), meta.messageId);
         return reply;
      });
   }
}
