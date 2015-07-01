
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';

const Promises = RedexGlobal.require('util/Promises');
const Redis = RedexGlobal.require('util/Redis');

export default function redisImporter(config, redex, logger) {

   assert(config.queue.in, 'queue.in');
   assert(config.queue.pending, 'queue.pending');
   assert(config.queue.reply, 'queue.reply');
   assert(config.timeout, 'timeout');
   assert(config.route, 'route');
   assert(config.popTimeout, 'popTimeout');

   let count = 0;
   let cancelled = false;
   const redis = new Redis({});

   async function addedPending(popReply, messageId) {
      logger.debug('addPending', messageId);
   }

   async function removePending(popReply, messageId, reply) {
      logger.debug('removePending', messageId);
   }

   async function revertPending(popReply, messageId, error) {
      logger.warn('revertPending:', messageId, error, error.stack);
   }

   async function pop() {
      logger.warn('redis.brpoplpush', config.queue.in, config.queue.pending, config.popTimeout);
      const popReply = await redis.brpoplpush(config.queue.in,
         config.queue.pending, config.popTimeout);
      if (popReply === null) {
         return;
      }
      count += 1;
      const messageId = count;
      try {
         await addedPending(popReply, messageId);
         let message = popReply;
         if (config.json) {
            message = JSON.parse(popReply);
         }
         logger.debug('pop', message);
         let reply = await redex.import(message, {messageId}, config);
         logger.debug('imported', messageId, reply);
         if (reply) {
            redis.lpush(config.queue.reply, reply);
         }
         await removePending(popReply, messageId, reply);
      } catch (err) {
         await revertPending(popReply, messageId, err);
         throw err;
      }
   }

   async function run() {
      while (!cancelled) {
         try {
            await pop();
         } catch (err) {
            logger.warn(err);
            await Promises.delay(errorDelay);
         }
      }
      logger.warn('cancelled');
   }

   const service = {
      get state() {
         return { config: config.summary, count: count };
      },
      start() {
         redis.init();
         setTimeout(() => run(), 4000);
      },
      end() {
         cancelled = true;
         redis.end();
      }
   };

   return service;
}
