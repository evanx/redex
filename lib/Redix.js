

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
      let messageId = message.redix.messageId;
      message.redix.route = route.slice(1);
      message.redix.routed.push(processorName);
      logger.info('dispatchMessage:', {processorName, nextProcessorName, messageId});
      let processor = this.getProcessor(nextProcessorName);
      processor.processMessage(message);
   }
}
