
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';
import util from 'util';

const Asserts = RedexGlobal.require('util/Asserts');

export default function rateLimiter(config, redex, logger) {

   let count = 0;
   let monitorId;

   function formatExceeded() {
      return util.format('%d exceeds %d in %sms',
         count, config.limit, config.periodMillis);
   }

   const service = {
      init() {
         Asserts.assertNumber(config.limit, 'limit');
         Asserts.assertNumber(config.periodMillis, 'periodMillis');
      },
      start() {
         count = 0;
         if (config.periodMillis) {
            monitorId = setInterval(() => {
               count = 0;
            }, config.periodMillis);
         }
         logger.info('started');
      },
      get state() {
         return { config: config.summary };
      },
      end() {
         if (monitorId) {
            clearInterval(monitorId);
         }
      },
      async process(message, meta, route) {
         logger.debug('count', count);
         count += 1;
         assert(count <= config.limit, 'Limit exceeded: ' + formatExceeded());
         return redex.dispatch(message, meta, route);
      }
   };

   return service;
}
