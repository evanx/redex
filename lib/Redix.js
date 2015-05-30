

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

   pushRouted(processorConfig, message) {
      let processorName = processorConfig.processorName;
      if (!message.redixInfo) {
         message.redixInfo = {};
      }
      if (!message.redixInfo.routed) {
         message.redixInfo.routed = [];
      }
      message.redixInfo.routed.push(processorName);
   }

   dispatchMessage(processorConfig, message, route) {
      let processorName = processorConfig.processorName;
      let nextProcessorName = route[0];
      this.pushRouted(processorConfig, message);
      let redixInfo = message.redixInfo;
      let messageId = redixInfo.messageId;
      redixInfo.route = route.slice(1);
      logger.info('dispatchMessage:', {processorName, nextProcessorName, messageId});
      let processor = this.getProcessor(nextProcessorName);
      processor.processMessage(message);
   }

   processReply(reply) {
      let nextProcessorName = reply.redixInfo.route[0];
      let processor = this.getProcessor(nextProcessorName);
      processor.processReply(reply);
   }

   dispatchReply(processorConfig, message, data) {
      let processorName = processorConfig.processorName;
      this.pushRouted(processorConfig, message);
      let redixInfo = message.redixInfo;
      let reply = { data, redixInfo };
      let messageId = redixInfo.messageId;
      redixInfo.route = message.redixInfo.routed.slice(0).reverse().slice(1);
      logger.info('dispatchReply', reply);
      this.processReply(reply);
   }

   dispatchErrorReply(processorConfig, message, error) {
      let processorName = processorConfig.processorName;
      pushRouted(processorConfig, message);
      let redixInfo = message.redixInfo;
      let reply = { data, redixInfo };
      let messageId = redixInfo.messageId;
      redixInfo.route = message.redixInfo.routed.slice(0).reverse().slice(1);
      this.pushRouted(processorConfig, reply);
      logger.info('dispatchErrorReply', reply);
      this.processReply(reply);
   }


}
