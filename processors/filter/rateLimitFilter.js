
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';
import bunyan from 'bunyan';
import util from 'util';

const Asserts = RedexGlobal.require('lib/Asserts');

export default function rateLimitFilter(config, redex, logger) {

   init();

   function init() {
      redex.assertNumber(config.limit, 'limit');
      redex.assertNumber(config.periodMillis, 'periodMillis');
      start();
   }

   function start() {
      count = 0;
      if (config.periodMillis) {
         setInterval(() => {
            count = 0;
         }, periodMillis);
      }
      logger.info('started');
   }

   function formatExceeded() {
      return util.format('%d exceeds %d in %sms',
         count, config.limit, config.periodMillis);
   }

   async function process(message, meta, route) {
      logger.debug('count', count);
      count += 1;
      assert(count <= config.limit, 'Limit exceeded: ' + formatExceeded());
      return redex.dispatch(message, meta, route);
   }
}
