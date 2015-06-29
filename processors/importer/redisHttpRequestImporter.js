
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';

const Redis = RedexGlobal.require('util/Redis');

export default function redisHttpRequestImporter(config, redex, logger) {

   assert(config.queue.in, 'queue.in');
   assert(config.queue.reply, 'queue.reply');
   assert(config.queue.pending, 'queue.pending');
   if (true) {
      assert(config.timeout, 'timeout');
      assert(config.route, 'route');
      assert(config.popTimeout, 'popTimeout');
      assert(config.errorDelay, 'errorDelay');
   }

   let redis;
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
      logger.debug('pop', config.queue.in, config.queue.pending, config.popTimeout);
      const redisReply = await redis.brpoplpush(config.queue.in, config.queue.pending, config.popTimeout);
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
            await Promises.delay(config.errorDelay);
         }
      }
      logger.info('cancelled');
   }

   const service = {
      init() {
      },
      start() {
         redis = new Redis();
         setTimeout(() => run(), 0);
      },
      end() {
         cancelled = true;
         redis.end();
      },
      get state() {
         return { config: config.summary, count: count };
      }
   };

   return service;
}
