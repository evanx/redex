
const logger = bunyan.createLogger({name: 'LimitFilter', level: 'debug'});

export default class LimitFilter {

   constructor(config) {
      this.config = config;
      this.limit = this.config.limit || 1;
      logger.info('constructor', this.config);
      this.count = 0;
   }

   processMessage(message) {
      logger.debug('incoming:', message.redix.messageId, message.redix.route);
      if (this.count < this.limit) {
         this.count += 1;
         redix.dispatchMessage(this.config, message, message.redix.route);
      } else {
         logger.info('drop:', message.redix.messageId);
      }
   }

   processReply(message) {
      logger.debug('reply:', message, message.redix.route);
      redix.dispatchMessage(this.config, message, message.redix.route);
   }

}
