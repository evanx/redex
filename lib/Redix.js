

export default class Redix {

   constructor(config) {
      this.config = config;
      this.processors = new Map();
      logger.info('constructor', this.constructor.name);
   }

   setProcessor(processorName, processor) {
      this.processors.set(processorName, processor);
   }

   getProcessor(processorName) {
      let processor = this.processors.get(processorName);
      if (!processor) {
         throw new Error('Missing processor: ' + processorName)
      }
      return processor;
   }

   dispatchMessage(processorConfig, message, route) {
      let processorName = processorConfig.processorName;
      let nextProcessorName = route[0];
      message.redixInfo.route = route.slice(1);
      if (!message.redixInfo) {
         message.redixInfo = {};
      }
      if (!message.redixInfo.routed) {
         message.redixInfo.routed = [];
      }
      message.redixInfo.routed.push(processorName);
      let messageId = message.redixInfo.messageId;
      logger.info('dispatchMessage:', {processorName, nextProcessorName, messageId});
      let processor = this.getProcessor(nextProcessorName);
      processor.processMessage(message);
   }

   dispatchReply(message, data) {
      let reply = {
         data: data,
         redixInfo: message.redix
      }
      reply.redixInfo.route = message.redixInfo.routed.slice(0).reverse().slice(1);
      logger.info('dispatchReply', reply);
      let nextProcessorName = reply.redixInfo.route[0];
      let processor = this.getProcessor(nextProcessorName);
      processor.processReply(reply);
   }


}
