
import bunyan from 'bunyan';
import lodash from 'lodash';
import { request } from '../lib/Requests';

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

   async processMessage(message) {
      try {
         const messageString = JSON.stringify(message);
         logger.info('processMessage', messageString);
         let addedCount = await redis.sadd(this.config.queue.pending, messageString);
         if (addedCount !== 1) {
            logger.warn('processMessage sadd', addedCount);
         }
         redix.dispatchReverseReply(this.config, message,
            await request({
               method: message.data.method || 'GET',
               url: message.data.url,
               json: message.data.json || true
            }));
      } catch (err) {
         logger.error('processMessage', err.stack);
         redix.dispatchReverseErrorReply(message, err);
      } finally {
         let removedCount = await redis.srem(this.config.queue.pending, messageString);
         if (removedCount !== 1) {
            logger.warn('processMessage srem', removedCount);
         }
      }
   }
}
