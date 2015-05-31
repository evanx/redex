
import assert from 'assert';
import bunyan from 'bunyan';

const logger = bunyan.createLogger({name: 'RedisHttpRequestImporter', level: 'debug'});

const redis = global.redisPromised;
const redisClient = redis.redisClient;

export default class RedisHttpRequestImporter {

   constructor(config) {
      this.config = config;
      logger.info('constructor', this.constructor.name, this.config);
      this.dispatch();
   }

   dispatch() {
      redis.brpop(this.config.queue.in, this.config.popTimeout || 0).then(redisReply => {
         logger.debug('redisReply:', redisReply);
         let data = JSON.parse(redisReply[1]);
         let message = { data };
         logger.info('pop:', message);
         redix.dispatchMessage(this.config, message, this.config.route);
         this.dispatch();
      }).catch(error => {
         logger.error('error:', error, error.stack);
         setTimeout(pop, config.errorWaitMillis || 1000);
      });
   }

   processReply(reply) {
      let data = JSON.stringify(reply.data);
      logger.info('processReply lpush:', this.config.queue.out, data);
      redis.lpush(this.config.queue.out, data).then(reply => {
         logger.info('processReply lpush reply:', reply);
      }, error => {
         logger.warn('processReply lpush error:', error);
      }).catch(error => {
         logger.error('processReply lpush error:', error.stack);
      });
   }
}
