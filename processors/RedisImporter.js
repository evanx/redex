
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redixrouter/LICENSE

import assert from 'assert';
import bunyan from 'bunyan';
import Redis from '../lib/Redis';

const logger = bunyan.createLogger({name: 'RedisImporter', level: global.redixLoggerLevel});

const redis = new Redis();

export default class RedisImporter {

   constructor(config) {
      assert(config.queue.in, 'queue.in');
      assert(config.queue.pending, 'queue.pending');
      assert(config.queue.reply, 'queue.reply');
      assert(config.route, 'route');
      this.config = config;
      logger.info('constructor', this.constructor.name, this.config);
      this.seq = 0;
      this.redisBlocking = new Redis();
      this.popTimeout = config.popTimeout || 0;
      this.dispatch();
   }

   async dispatch() {
      try {
         let message = await this.redisBlocking.brpoplpush(this.config.queue.in,
            this.config.queue.pending, this.popTimeout);
         this.seq += 1;
         if (this.config.json) {
            message = JSON.parse(message);
         }
         logger.debug('pop:', message);
         let messageId = this.seq;
         let reply = await redix.processMessage(messageId, this.config.route, message);
         logger.debug('ok', messageId, reply);
         if (reply) {
            this.redisBlocking.lpush(this.config.queue.reply, reply);
         }
         //setTimeout(() => this.dispatch(), 0);
      } catch(err) {
         logger.error('error:', err, err.stack);
         setTimeout(() => this.dispatch(), config.errorWaitMillis || 1000);
      }
   }
}
