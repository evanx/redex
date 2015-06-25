
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

   let count = 0;
   let popTimeout = config.popTimeout || 0;
   let redis = new Redis();

   pop();

   function addedPending(messageId, redisReply) {
      logger.debug('addPending', messageId);
   }

   function removePending(messageId, redisReply) {
      logger.debug('removePending', messageId);
   }

   function revertPending(messageId, redisReply, error) {
      logger.warn('revertPending:', messageId, error, error.stack);
   }

   async function pop() {
      try {
         logger.debug('pop', config.queue.in);
         var redisReply = await redis.brpoplpush(config.queue.in, config.queue.pending, popTimeout);
         count += 1;
         var messageId = count;
         var expiryTime = new Date().getTime() + config.timeout;
         addedPending(messageId, redisReply);
         logger.debug('redisReply', redisReply);
         let message = JSON.parse(redisReply);
         logger.info('pop:', message);
         let reply = await redex.import(message, {messageId}, config);
         logger.info('reply:', reply);
         await redis.lpush(config.queue.reply, JSON.stringify(reply));
         removePending(messageId, redisReply);
         //throw new Error('test');
         pop();
      } catch (error) {
         redis.lpush(config.queue.error, JSON.stringify(error));
         revertPending(messageId, redisReply, error);
         setTimeout(() => pop(), config.errorWaitMillis || 1000);
      }
   }

   const service = {
      get state() {
         return { config: config.summary, count: count };
      },
   };

   return service;
}
