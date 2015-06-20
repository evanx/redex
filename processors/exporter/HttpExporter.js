
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';
import bunyan from 'bunyan';
import lodash from 'lodash';

import { request } from '../../lib/Requests';
import Redis from '../../lib/Redis';

const redis = new Redis();

const logger = bunyan.createLogger({name: 'HttpExporter', level: global.redexLoggerLevel});

const { redex } = global;

export default class HttpExporter {

   constructor(config) {
      redex.assert(!config.route, 'route');
      redex.assert(config.queue.pending);
      this.config = config;
      logger.info('constructor', this.constructor.name, this.config);
   }

   async process(message, meta, route) {
      try {
         var messageString = JSON.stringify(message);
         logger.debug('promise', meta, route, messageString);
         assert.equal(await redis.sadd(this.config.queue.pending, messageString),
            1, 'sadd');
         return request({
            method: message.method || 'GET',
            url: message.url,
            json: message.json || true
         });
      } catch (err) {
         logger.error('promise', err.stack);
         return err;
      } finally {
         assert.equal(await redis.srem(this.config.queue.pending, messageString),
            1, 'srem');
      }
   }
}
