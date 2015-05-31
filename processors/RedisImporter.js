
import assert from 'assert';
import bunyan from 'bunyan';
import Redis from '../lib/Redis';

const logger = bunyan.createLogger({name: 'RedisImporter', level: 'debug'});

const redis = new Redis();

export default class RedisImporter {

   constructor(config) {
      assert(config.queue.in, 'queue.in');
      assert(!config.queue.out, 'queue.out');
      assert(config.route, 'route');
      this.config = config;
      logger.info('constructor', this.constructor.name, this.config);
      this.seq = 0;
      this.redisBlocking = new Redis();
      this.popTimeout = config.popTimeout || 0;
      this.dispatch();
   }

   dispatch() {
      this.redisBlocking.brpop(this.config.queue.in, this.popTimeout).then(redisReply => {
         this.seq += 1;
         let data = redisReply[1];
         if (this.config.json) {
            data = JSON.parse(data);
         }
         logger.debug('data:', data);
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
      logger.warn('processReply not implemented:', reply);
   }
}
