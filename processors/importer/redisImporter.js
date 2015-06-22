
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';

const Redis = RedexGlobal.require('lib/Redis');

const redis = new Redis();

export default function redisImporter(config, redex, logger) {

   assert(config.queue.in, 'queue.in');
   assert(config.queue.pending, 'queue.pending');
   assert(config.queue.reply, 'queue.reply');
   assert(config.timeout, 'timeout');
   assert(config.route, 'route');

   let count = 0;
   let redis = new Redis();
   let popTimeout = config.popTimeout || 0;

   pop();

   function addedPending(popReply, messageId) {
      logger.debug('addPending', messageId);
   }

   function removePending(popReply, messageId, reply) {
      logger.debug('removePending', messageId);
   }

   function revertPending(popReply, messageId, error) {
      logger.warn('revertPending:', messageId, error, error.stack);
   }

   async function pop() {
      count += 1;
      let messageId = count;
      const popReply = await redis.brpoplpush(config.queue.in,
         config.queue.pending, popTimeout);
      try {
         addedPending(popReply, messageId);
         let message = popReply;
         if (config.json) {
            message = JSON.parse(popReply);
         }
         logger.debug('pop:', message);
         let reply = await redex.import(message, {messageId}, config);
         logger.debug('ok', messageId, reply);
         if (reply) {
            redis.lpush(config.queue.reply, reply);
         }
         removePending(popReply, messageId, reply);
      } catch (err) {
         revertPending(popReply, messageId, err);
         throw err;
      }
   }

   const service = {
      get state() {
         return { config: config.summary, count: count };
      },
   };

   return service;
}
