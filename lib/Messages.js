

const app = require('./app');


export default class Messages {

   dispatchMessage(config, message) {
      let processorName = this.config.route[0];
      message.meta.routed.push(this.config.processorName);
      message.meta.routed.push(processorName);
      message.meta.route = this.config.route.slice(1);
      let processor = app.getProcessor(processorName);
      log.info('process', message, message.meta.route, processorName);
      processor.processMessage(message);
   }
}
