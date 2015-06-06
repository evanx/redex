
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

   addedPending(messageId, redisReply) {
      logger.debug('addPending', messageId, redisReply);
   }

   removePending(messageId, redisReply) {
      logger.debug('removePending');
   }

   revertPending(messageId, redisReply) {
      logger.debug('revertPending');
   }

   async pop() {
      try {
         logger.debug('pop', this.config.queue.in);
         var redisReply = await this.redisBlocking.brpoplpush(this.config.queue.in,
            this.config.queue.pending, this.popTimeout || 0);
         this.seq += 1;
         var messageId = this.seq;
         this.addedPending(messageId, redisReply);
         let message = JSON.parse(redisReply);
         logger.info('pop:', message);
         let reply = await redix.processMessage(messageId, this.config.route, message);
         logger.info('reply:', reply);
         await this.redisBlocking.lpush(this.config.queue.out, JSON.stringify(reply));
         this.removePending(messageId, redisReply);
         //throw new Error('test');
         this.pop();
      } catch (error) {
         logger.error('error:', error, error.stack);
         this.revertPending(messageId, redisReply);
         this.redisBlocking.lpush(this.config.queue.error, JSON.stringify(error));
         setTimeout(() => this.pop(), config.errorWaitMillis || 1000);
      }
   }
}
