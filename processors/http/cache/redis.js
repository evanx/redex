
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';
import bunyan from 'bunyan';
import util from 'util';

const Redis = requireRedex('lib/Redis');

export default function httpCacheRedis(config, redex, logger) {

   assert(config.redisKey, 'redisKey');
   assert(config.expiry, 'expiry');

   const redis = new Redis();

   logger.info('started');

   const service = {
      get state() {
         return { config };
      },
      async process(message, meta, route) {
         assert.equal(meta.type, 'express', 'http message type: ' + meta.type);
         assert(message.url, 'message url: ' + meta.type);
         let redisKey = config.redisKey + ':' + message.url;
         logger.info('process', redisKey);
         const cached = await redis.get(redisKey);
         if (cached !== null) {
            return cached;
         }
         return redex.dispatch(message, meta, route).then(reply => {
            assert(reply.statusCode, 'reply statusCode');
            if (reply.statusCode === 200) {
               redis.set(config.redisKey + ':' + message.url);
            }
            return reply;
         });
      }
   };

   return service;
}
