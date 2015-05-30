
const log = bunyan.createLogger({name: 'RedisHttpRequestImporter', level: 'debug'});

export default class RedisHttpRequestImporter {

   constructor(config) {
      this.config = config;
      logger.info('constructor', this.constructor.name, this.config);
      this.dispatch();
   }

   dispatch() {
      redis.brpop(this.config.queue, this.config.popTimeout || 0).then(string => {
         let message = JSON.parse(string);
         logger.info('pop:', message);
         redix.dispatchMessage(this.config, message, this.config.route);
         pop();
      }).catch(error => {
         logger.error('error:', error);
         setTimeout(pop, config.errorWaitMillis || 1000);
      });
   }

   processReply(reply) {
      logger.info('reply:', reply);
   }

}
