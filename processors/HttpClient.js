
import lodash from 'lodash';
import request from 'request';

const log = global.bunyan.createLogger({name: 'HttpClient', level: 'debug'});

const app = require('../lib/app');

export default class HttpClient {
   constructor(config) {
      this.config = config;
      log.info('constructor', this.config);
   }

   processMessage(message) {
      log.info('process', message);
      request({
         url: message.url,
         json: true
      }, (err, response, reply) => {
         if (err) {
            log.warn('process', {err});
         } else if (response.statusCode !== 200) {
            log.warn('process', { statusCode: response.statusCode });
         } else {
            log.info('process', reply[0].title);
            this.dispatchReply(message, reply[0]);
         }
      });
   }

   dispatchReply(message, data) {
      let reply = {
         data: data,
         meta: message.meta
      }
      reply.meta.route = message.meta.routed.slice(0).reverse().slice(1);
      let processorName = reply.meta.route[0];
      log.info('dispatchReply', reply);
      let processor = app.getProcessor(processorName);
      processor.processReply(reply);
   }

}
