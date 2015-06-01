
import assert from 'assert';
import bunyan from 'bunyan';
import Redis from '../lib/Redis';

const logger = bunyan.createLogger({name: 'RedisHttpRequestImporter', level: 'debug'});

const redis = new Redis();

export default class RedisHttpRequestImporter {

   constructor(config) {
      assert(config.queue.in, 'queue.in');
      assert(config.queue.out, 'queue.out');
      assert(config.queue.pending, 'queue.pending');
      assert(config.route, 'route');
      this.config = config;
      logger.info('constructor', this.constructor.name, this.config);
      this.seq = 0;
      this.popTimeout = this.config.popTimeout || 0;
      this.redisBlocking = new Redis();
      this.pop();
   }

   addedPending(redisReply) {

   }

   removePending(redisReply) {

   }

   revertPending(redisReply) {

   }

   async pop() {
      try {
         const redisReply = await this.redisBlocking.brpoplpush(this.config.queue.in,
            this.config.queue.pending, this.popTimeout || 0);
         this.addedPending(redisReply);
         this.seq += 1;
         logger.debug('redisReply:', redisReply);
         let data = JSON.parse(redisReply);
         let messageId = this.seq;
         let redixInfo = { messageId };
         let message = { data, redixInfo };
         logger.info('pop:', message);
         redix.dispatchMessage(this.config, message, this.config.route);
         this.removePending(redisReply);
         this.pop();
      } catch (error) {
         logger.error('error:', error, error.stack);
         this.revertPending(redisReply);
         this.redisBlocking.lpush(this.config.queue.error, JSON.stringify(error));
         setTimeout(this.pop, config.errorWaitMillis || 1000);
      }
   }

   async processReply(reply) {
      try {
         let data = JSON.stringify(reply);
         logger.info('processReply lpush:', this.config.queue.out, data);
         let redisReply = await redis.lpush(this.config.queue.out, data);
         logger.info('processReply lpush reply:', redisReply);
      } catch(error) {
         logger.error('processReply lpush error:', error.stack);
      }
   }
}
