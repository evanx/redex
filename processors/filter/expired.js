
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';
import util from 'util';

export default function filterExpired(config, redex, logger) {

   let count = 0;

   start();

   start() {
      logger.info('started');
   }

   formatDuration(millis) {
      if (millis > 1000) {
         return '' + (millis/1000).toFixed(3) + 's';
      } else {
         return util.format('%dms', millis);
      }
   }

   const service = {
      async process(message, meta, route) {
         count += 1;
         let time = new Date().getTime();
         logger.debug('promise:', meta, route);
         if (meta.expires) {
            assert(meta.expires > time, 'Expired message');
         }
         return redex.dispatch(message, meta, route).then(reply => {
            let replyTime = new Date().getTime();
            let duration = replyTime - time;
            logger.debug('promise duration:', formatDuration(duration));
            if (meta.expires) {
               assert(meta.expires > replyTime, 'Expired reply');
            }
            return reply;
         });
      }
   };

   return service;
}
