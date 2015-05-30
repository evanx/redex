

const app = require('./app');


export default class Messages {

   dispatchMessage(config, message) {
      let processorName = this.config.route[0];
      message.redix.routed.push(this.config.processorName);
      message.redix.routed.push(processorName);
      message.redix.route = this.config.route.slice(1);
      let processor = app.getProcessor(processorName);
      logger.info('process', message, message.redix.route, processorName);
      processor.processMessage(message);
   }
}
