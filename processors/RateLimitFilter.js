
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

   async processMessage(messageId, route, message) {
      logger.debug('incoming:', messageId, route);
      if (this.count < this.config.limit) {
         this.count += 1;
         return redix.processMessage(messageId, route, message);
      } else {
         logger.info('drop:', messageId);
      }
   }
}
