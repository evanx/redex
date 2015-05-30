
import lodash from 'lodash';
import request from 'request';

const log = global.bunyan.createLogger({name: 'HttpGet', level: 'debug'});

const { redix } = global;

export default class HttpGet {

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
            redix.dispatchErrorReply(message, err);
         } else if (response.statusCode !== 200) {
            err = { statusCode: response.statusCode };
            logger.warn('process', err);
            redix.dispatchErrorReply(message, err);
         } else {
            logger.info('process', reply);
            redix.dispatchReply(message, reply);
         }
      });
   }
}
