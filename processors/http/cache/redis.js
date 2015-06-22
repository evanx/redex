
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';
import bunyan from 'bunyan';
import util from 'util';

const Millis = requireRedex('lib/Millis');
const Redis = requireRedex('lib/Redis');

export default function httpCacheRedis(config, redex, logger) {

   assert(config.redisKey, 'redisKey');
   config.expire = Millis.assert(config.expire, 'expire');

   const redis = new Redis();

   logger.info('started', config.redisKey, Millis.format(config.expire), config.expire);

   const service = {
      get state() {
         return { config: config.summary };
      },
      async process(message, meta, route) {
         assert.equal(meta.type, 'express', 'http message type: ' + meta.type);
         assert(message.url, 'message url: ' + meta.type);
         let redisKey = config.redisKey + ':hashes:' + message.url;
         logger.info('redisKey', redisKey);
         if (config.clear) {
           await redis.del(redisKey);
         } else {
           const cached = await redis.hgetall(redisKey);
           if (cached !== null) {
             logger.info('cached', cached);
             return cached;
           }
         }
         return redex.dispatch(message, meta, route).then(reply => {
            assert(reply.statusCode, 'reply statusCode');
            if (reply.statusCode === 200) {
               redis.hmset(redisKey, reply);
               redis.expire(redisKey, config.expire);
            }
            return reply;
         });
      }
   };

   return service;
}
