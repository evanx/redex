
import bunyan from 'bunyan';

const logger = bunyan.createLogger({name: 'redix', level: 'info'});

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

   pushRouted(message, processorName) {
      if (!message.redixInfo) {
         message.redixInfo = {};
      }
      if (!message.redixInfo.routed) {
         message.redixInfo.routed = [];
      }
      message.redixInfo.routed.push(processorName);
   }

   processMessage(message, route) {
      let redixInfo = message.redixInfo;
      let messageId = redixInfo.messageId;
      logger.info('processMessage:', {messageId, redixInfo});
      let nextProcessorName = route[0];
      redixInfo.route = route.slice(1);
      let processor = this.getProcessor(nextProcessorName);
      processor.processMessage(message);
   }

   processReply(message, route) {
      try {
         let redixInfo = message.redixInfo;
         let messageId = redixInfo.messageId;
         logger.info('processReply:', {messageId, redixInfo});
         let nextProcessorName = route[0];
         redixInfo.route = route.slice(1);
         let processor = this.getProcessor(nextProcessorName);
         processor.processReply(message);
      } catch (error) {
         logger.error('processReply', error, error.stack);
      }
   }

   dispatchMessage(processorConfig, message, route) {
      let processorName = processorConfig.processorName;
      this.pushRouted(message, processorName);
      let redixInfo = message.redixInfo;
      let messageId = redixInfo.messageId;
      logger.info('dispatchMessage:', {processorName, messageId, redixInfo});
      this.processMessage(message, route);
   }

   dispatchReply(processorConfig, message, route) {
      let processorName = processorConfig.processorName;
      this.pushRouted(message, processorName);
      let redixInfo = message.redixInfo;
      let messageId = redixInfo.messageId;
      logger.info('dispatchMessage:', {processorName, messageId, redixInfo});
      this.processReply(message, route);
   }

   dispatchReverseReply(processorConfig, message, data) {
      let processorName = processorConfig.processorName;
      this.pushRouted(message, processorName);
      let redixInfo = message.redixInfo;
      let reply = { data, redixInfo };
      let messageId = redixInfo.messageId;
      let route = redixInfo.routed.slice(0).reverse().slice(1);
      logger.info('dispatchReverseReply', reply);
      this.processReply(reply, route);
   }

   dispatchReverseErrorReply(processorConfig, message, error) {
      let processorName = processorConfig.processorName;
      this.pushRouted(message, processorName);
      let redixInfo = message.redixInfo;
      let reply = { data, redixInfo };
      let messageId = redixInfo.messageId;
      let route = redixInfo.routed.slice(0).reverse().slice(1);
      this.pushRouted(processorConfig, reply);
      logger.info('dispatchReverseErrorReply', reply);
      this.processReply(reply, route);
   }

}
