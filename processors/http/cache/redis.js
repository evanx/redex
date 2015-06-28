
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';
import util from 'util';

const Seconds = RedexGlobal.require('util/Seconds');
const Redis = RedexGlobal.require('util/Redis');

export default function httpCacheRedis(config, redex, logger) {

   assert(config.redisKey, 'redisKey');
   config.expire = Seconds.assert(config.expire, 'expire');

   const redis = new Redis();

   logger.info('started', config.redisKey, Seconds.format(config.expire), config.expire);

   const service = {
      init() {
      },
      start() {
      },
      end() {
         redis.end();
      },
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
               logger.debug('hgetall', cached.contentType, cached.content.length, Object.keys(cached));
               return cached;
            }
         }
         let reply = await redex.dispatch(message, meta, route);
         logger.info('reply', Object.keys(reply));
         assert(reply.statusCode, 'reply statusCode');
         if (reply.statusCode === 200) {
            let cached = {
               statusCode: reply.statusCode,
               contentType: reply.contentType,
               dataType: 'string',
               content: reply.content.toString()
            };
            logger.info('hmset', cached.contentType, cached.content.length);
            redis.hmset(redisKey, cached);
            redis.expire(redisKey, config.expire);
         }
         return reply;
      }
   };

   return service;
}
