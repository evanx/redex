
const logger = bunyan.createLogger({name: 'RedisHttpRequestImporter', level: 'debug'});

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
      logger.info('reply:', reply);
   }

}
