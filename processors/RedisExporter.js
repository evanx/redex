
import bunyan from 'bunyan';
import Redis from '../lib/Redis';

const logger = bunyan.createLogger({name: 'RedisExporter', level: 'debug'});

const redis = new Redis();

export default class RedisExporter {

   constructor(config) {
      redix.assert(config.queue.out, 'queue.out');
      redix.assert(!config.queue.in, 'queue.in');
      this.config = config;
      logger.info('constructor', this.constructor.name, this.config);
   }

   processMessage(message) {
      let data = message.data;
      if (this.config.json) {
         data = JSON.stringify(data);
      } else {
         data = data.toString();
      }
      logger.info('processMessage lpush:', this.config.queue.out, data);
      redis.lpush(this.config.queue.out, data).then(reply => {
         logger.info('processMessage lpush reply:', reply);
      }, error => {
         logger.warn('processMessage lpush error:', error);
      }).catch(error => {
         logger.error('processMessage lpush error:', error.stack);
      });
   }

   processReply(reply) {
      logger.warn('processReply not implemented:', reply);
   }

}
