

export default class Redix {
   constructor(config) {
      this.config = config;
      this.processors = new Map();
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

   dispatchMessage(router, message) {
      let route = router.route;
      let nextProcessorName = route[0];
      message.meta.route = route.slice(1);
      message.meta.routed.push(router.processorName);
      message.meta.routed.push(nextProcessorName);
      let processor = this.getProcessor(nextProcessorName);
      log.info('dispatchMessage', {message, nextProcessorName});
      processor.processMessage(message);
   }
}
