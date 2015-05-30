
import lodash from 'lodash';
import request from 'request';

const log = global.bunyan.createLogger({name: 'HttpClient', level: 'debug'});

const { redix } = global;

export default class HttpClient {

   constructor(config) {
      this.config = config;
      logger.info('constructor', this.constructor.name, this.config);
   }

   processMessage(message) {
      logger.info('process', message);
      request({
         url: message.url,
         json: true
      }, (err, response, reply) => {
         if (err) {
            logger.warn('process', {err});
         } else if (response.statusCode !== 200) {
            logger.warn('process', { statusCode: response.statusCode });
         } else {
            logger.info('process', reply);
            this.dispatchReply(message, reply);
         }
      });
   }

   dispatchReply(message, data) {
      let reply = {
         data: data,
         redix: message.redix
      }
      reply.redix.route = message.redix.routed.slice(0).reverse().slice(1);
      logger.info('dispatchReply', reply);
      let nextProcessorName = reply.redix.route[0];
      let processor = redix.getProcessor(nextProcessorName);
      processor.processReply(reply);
   }

}
