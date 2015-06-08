
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redixrouter/LICENSE

import assert from 'assert';
import bunyan from 'bunyan';
import util from 'util';

export default class ExpiredFilter {

   constructor(config) {
      this.config = config;
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
       return util.format('%ds', millis/1000);
     } else {
       return util.format('%dms', millis);
     }
   }

   async processMessage(message, meta, route) {
      this.count += 1;
      let time = new Date().getTime();
      this.logger.debug('processMessage:', meta, route);
      if (meta.expires) {
        assert(meta.expires > time, 'Expired message');
      }
      return redix.dispatchMessage(message, meta, route).then(reply => {
         let replyTime = new Date().getTime();
         let duration = replyTime - time;
         this.logger.debug('processMessage reply:', meta, this.formatDuration(duration));
         if (meta.expires) {
           assert(meta.expires > replyTime, 'Expired reply');
         }
         return reply;
      });
   }
}
