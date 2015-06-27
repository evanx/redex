
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';
import util from 'util';

export default function durationMonitor(config, redex, logger) {

   let count = 0;

   function formatDuration(millis) {
      if (millis > 1000) {
         let seconds = millis/1000;
         return '' + seconds.toFixed(3) + 's';
      } else {
         return util.format('%dms', millis);
      }
   }

   const service = {
      start() {
         logger.info('started');
      },
      get state() {
         return { config: config.summary };
      },
      async process(message, meta, route) {
         count += 1;
         let time = new Date().getTime();
         return redex.dispatch(message, meta, route).then(reply => {
            let replyTime = new Date().getTime();
            let duration = replyTime - time;
            logger.debug('duration:', formatDuration(duration), meta.messageId);
            return reply;
         });
      }
   };

   return service;
}
