
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';

const Redis = RedexGlobal.require('util/Redis');

const redis = new Redis();

export default function redisHttpRequestImporter(config, redex, logger) {

   assert(config.queue.in, 'queue.in');
   assert(config.queue.reply, 'queue.reply');
   assert(config.queue.pending, 'queue.pending');
   assert(config.timeout, 'timeout');
   assert(config.route, 'route');

   const popTimeout = config.popTimeout || 2;
   const errorWaitMillis = config.errorWaitMillis || 1000;
   const redis = new Redis({});
   let cancelled = false;
   let count = 0;

   async function addedPending(messageId, redisReply) {
      logger.debug('addPending', messageId);
   }

   async function removePending(messageId, redisReply) {
      logger.debug('removePending', messageId);
   }

   async function revertPending(messageId, redisReply, error) {
      logger.warn('revertPending:', messageId, error, error.stack);
   }

   async function pop() {
      logger.debug('pop', config.queue.in, config.queue.pending, popTimeout);
      const redisReply = await redis.brpoplpush(config.queue.in, config.queue.pending, popTimeout);
      if (redisReply === null) {
         return;
      }
      count += 1;
      const messageId = count;
      try {
         var expiryTime = new Date().getTime() + config.timeout;
         await addedPending(messageId, redisReply);
         logger.debug('redisReply', redisReply);
         let message = JSON.parse(redisReply);
         logger.info('pop:', message);
         let reply = await redex.import(message, {messageId}, config);
         logger.info('reply:', reply);
         await redis.lpush(config.queue.reply, JSON.stringify(reply));
         await removePending(messageId, redisReply);
         //throw new Error('test');
      } catch (error) {
         await redis.lpush(config.queue.error, JSON.stringify(error));
         await revertPending(messageId, redisReply, error);
         throw error;
      }
   }

   async function run() {
      while (!cancelled) {
         try {
            await pop();
         } catch (error) {
            logger.warn(error);
            await Promises.delay(errorWaitMillis);
         }
      }
   }

   const service = {
      get state() {
         return { config: config.summary, count: count };
      },
      start() {
         redis.init();
         setTimeout(() => run(), 0);
      },
      end() {
         redis.end();
      }
   };

   return service;
}
