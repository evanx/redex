
import assert from 'assert';
import bunyan from 'bunyan';
import Redis from '../lib/Redis';

const logger = bunyan.createLogger({name: 'RedisHttpRequestImporter', level: 'debug'});

const redis = new Redis();
const redisBlocking = new Redis();

export default class RedisHttpRequestImporter {

   constructor(config) {
      this.config = config;
      logger.info('constructor', this.constructor.name, this.config);
      this.dispatch();
      this.seq = 0;
   }

   dispatch() {
      redisBlocking.brpop(this.config.queue.in, this.config.popTimeout || 0).then(redisReply => {
         this.seq += 1;
         logger.debug('redisReply:', redisReply);
         let data = JSON.parse(redisReply[1]);
         let messageId = this.seq;
         let redixInfo = { messageId };
         let message = { data, redixInfo };
         logger.info('pop:', message);
         redix.dispatchMessage(this.config, message, this.config.route);
         this.dispatch();
      }).catch(error => {
         logger.error('error:', error, error.stack);
         setTimeout(this.dispatch, config.errorWaitMillis || 1000);
      });
   }

   processReply(reply) {
      let data = JSON.stringify(reply.data);
      logger.info('processReply lpush:', this.config.queue.out, typeof data, data);
      redis.lpush(this.config.queue.out, data).then(reply => {
         logger.info('processReply lpush reply:', reply);
      }, error => {
         logger.warn('processReply lpush error:', error);
      }).catch(error => {
         logger.error('processReply lpush error:', error.stack);
      });
   }
}
