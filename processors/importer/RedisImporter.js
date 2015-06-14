
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redixrouter/LICENSE

import assert from 'assert';
import bunyan from 'bunyan';

import Redis from '../../lib/Redis';

const logger = bunyan.createLogger({name: 'RedisImporter', level: global.redixLoggerLevel});

const redis = new Redis();

export default class RedisImporter {

   constructor(config) {
      assert(config.queue.in, 'queue.in');
      assert(config.queue.pending, 'queue.pending');
      assert(config.queue.reply, 'queue.reply');
      assert(config.timeout, 'timeout');
      assert(config.route, 'route');
      this.config = config;
      logger.info('constructor', this.constructor.name, this.config);
      this.seq = 0;
      this.redis = new Redis();
      this.popTimeout = config.popTimeout || 0;
      this.pop();
   }

   addedPending(popReply, messageId) {
      logger.debug('addPending', messageId);
   }

   removePending(popReply, messageId, reply) {
      logger.debug('removePending', messageId);
   }

   revertPending(popReply, messageId, error) {
      logger.warn('revertPending:', messageId, error, error.stack);
   }

   async pop() {
      this.seq += 1;
      let messageId = this.seq;
      const popReply = await this.redis.brpoplpush(this.config.queue.in,
         this.config.queue.pending, this.popTimeout);
      try {
         this.addedPending(popReply, messageId);
         let message = popReply;
         if (this.config.json) {
            message = JSON.parse(popReply);
         }
         logger.debug('pop:', message);
         let reply = await redix.import(message, {messageId}, this.config);
         logger.debug('ok', messageId, reply);
         if (reply) {
            this.redis.lpush(this.config.queue.reply, reply);
         }
         this.removePending(popReply, messageId, reply);
      } catch (err) {
         this.revertPending(popReply, messageId, err);
         throw err;
      }
   }
}
