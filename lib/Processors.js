

const app = require('./app');


module.exports = {

   dispatchMessage(router, message) {
      let route = router.route;
      let nextProcessorName = route[0];
      message.meta.route = route.slice(1);
      message.meta.routed.push(router.processorName);
      message.meta.routed.push(nextProcessorName);
      let processor = app.getProcessor(nextProcessorName);
      log.info('dispatchMessage', {message, nextProcessorName});
      processor.processMessage(message);
   }
}
