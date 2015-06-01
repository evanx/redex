
import bunyan from 'bunyan';
import lodash from 'lodash';
import request from 'request';

import Redis from '../lib/Redis';

const redis = new Redis();

const logger = bunyan.createLogger({name: 'HttpGet', level: 'debug'});

const { redix } = global;

export default class HttpGet {

   constructor(config) {
      redix.assert(!config.route, 'route');
      redix.assert(config.queue.pending);
      this.config = config;
      logger.info('constructor', this.constructor.name, this.config);
   }

   processMessage(message) {
      logger.info('process', message);
      redis.sadd(this.config.queue.pending, JSON.stringify(message)).then(reply => {
         if (reply !== 1) {
            logger.warn('process sadd', reply);
         }
         request({
            url: message.data.url,
            json: true
         }, (err, response, reply) => {
            if (err) {
               logger.warn('process', {err});
               redix.dispatchReverseErrorReply(message, err);
            } else if (response.statusCode !== 200) {
               err = { statusCode: response.statusCode };
               logger.warn('process', err);
               redix.dispatchReverseErrorReply(this.config, message, err);
            } else {
               logger.info('process', reply);
               redix.dispatchReverseReply(this.config, message, reply);
            }
            redis.srem(this.config.queue.pending, message).then(reply => {
               if (reply !== 1) {
                  logger.warn('process sadd', reply);
               }
            });
         });
      });
   }
}
