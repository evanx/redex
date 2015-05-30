
const logger = bunyan.createLogger({name: 'LimitFilter', level: 'debug'});

export default class LimitFilter {

   constructor(config) {
      this.config = config;
      this.limit = this.config.limit || 1;
      logger.info('constructor', this.config);
      this.count = 0;
   }

   processMessage(message) {
      logger.debug('incoming:', message.redixInfo.messageId, message.redixInfo.route);
      if (this.count < this.limit) {
         this.count += 1;
         redix.dispatchMessage(this.config, message, message.redixInfo.route);
      } else {
         logger.info('drop:', message.redixInfo.messageId);
      }
   }

   processReply(reply) {
      logger.debug('reply:', reply, reply.redixInfo.route);
      redix.dispatchMessage(this.config, reply, reply.redixInfo.route);
   }

}
