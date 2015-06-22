
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';

const Redis = RedexGlobal.require('lib/Redis');

const redis = new Redis();

export default function redisExporter(config, redex, logger) {

   assert(config.queue.out, 'queue.out');
   assert(!config.queue.in, 'queue.in');
   assert(!config.route, 'route');

   function formatMessage(message) {
      if (config.json) {
         return JSON.stringify(message);
      } else {
         return message.toString();
      }
   }

   const service = {
      get state() {
         return { config: config.summary };
      },
      async process(message, meta, route) {
         let string = formatMessage(message);
         logger.debug('promise lpush:', meta, config.queue.out, string);
         await redis.lpush(config.queue.out, string);
         return;
      }
   };

   return service;
}
