
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';
import util from 'util';

export default function timeout(config, redex, logger) {

   assert(config.timeout, 'timeout');

   let count = 0;
   
   start();

   function start() {
      logger.info('started');
   }

   function formatDuration(millis) {
      if (millis > 1000) {
         return '' + (millis/1000).toFixed(3) + 's';
      } else {
         return util.format('%dms', millis);
      }
   }

   const service = {
      get state() {
         return { config: config.summary };
      },
      async process(message, meta, route) {
         count += 1;
         let time = new Date().getTime();
         logger.debug('promise:', meta, route);
         return redex.dispatch(message, meta, route).then(reply => {
            let replyTime = new Date().getTime();
            let duration = replyTime - time;
            logger.debug('promise duration:', formatDuration(duration));
            assert(duration < config.timeout, 'Expired reply');
            return reply;
         });
      }
   };
   return service;
}
