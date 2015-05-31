
import assert from 'assert';
import bunyan from 'bunyan';

const logger = bunyan.createLogger({name: 'RateLimitFilter', level: 'debug'});

export default class RateLimitFilter {

   constructor(config) {
      redix.assertNumber(config.limit, 'limit');
      redix.assertNumber(config.periodMillis, 'periodMillis');
      this.config = config;
      logger.info('constructor', this.config);
      this.count = 0;
      if (this.config.periodMillis) {
         setTimeout(this.resetCount, this.periodMillis);
      }
   }

   resetCount() {
      this.count = 0;
   }

   processMessage(message) {
      logger.debug('incoming:', message.redixInfo.messageId, message.redixInfo.route);
      if (this.count < this.config.limit) {
         this.count += 1;
         redix.dispatchMessage(this.config, message, message.redixInfo.route);
      } else {
         logger.info('drop:', message.redixInfo.messageId);
      }
   }

   processReply(reply) {
      logger.debug('reply:', reply, reply.redixInfo.route);
      redix.dispatchReply(this.config, reply, reply.redixInfo.route);
   }

}
