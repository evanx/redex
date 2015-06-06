
import bunyan from 'bunyan';
import lodash from 'lodash';
import { request } from '../lib/Requests';

import Redis from '../lib/Redis';

const redis = new Redis();

const logger = bunyan.createLogger({name: 'HttpExporter', level: 'debug'});

const { redix } = global;

export default class HttpExporter {

   constructor(config) {
      redix.assert(!config.route, 'route');
      redix.assert(config.queue.pending);
      this.config = config;
      logger.info('constructor', this.constructor.name, this.config);
   }

   async processMessage(messageId, route, message) {
      const messageString = JSON.stringify(message);
      try {
         logger.info('processMessage', messageId, route, messageString);
         let addedCount = await redis.sadd(this.config.queue.pending, messageString);
         if (addedCount !== 1) {
            logger.warn('processMessage sadd', addedCount);
         }
         return request({
            method: message.method || 'GET',
            url: message.url,
            json: message.json || true
         });
      } catch (err) {
         logger.error('processMessage', err.stack);
         return err;
      } finally {
         let removedCount = await redis.srem(this.config.queue.pending, messageString);
         if (removedCount !== 1) {
            logger.warn('processMessage srem', removedCount);
         }
      }
   }
}
