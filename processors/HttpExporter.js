
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redixrouter/LICENSE

import assert from 'assert';
import bunyan from 'bunyan';
import lodash from 'lodash';

import { request } from '../lib/Requests';

import Redis from '../lib/Redis';

const redis = new Redis();

const logger = bunyan.createLogger({name: 'HttpExporter', level: global.redixLoggerLevel});

const { redix } = global;

export default class HttpExporter {

   constructor(config) {
      redix.assert(!config.route, 'route');
      redix.assert(config.queue.pending);
      this.config = config;
      logger.info('constructor', this.constructor.name, this.config);
   }

   async processMessage(message, meta, route) {
      try {
         var messageString = JSON.stringify(message);
         logger.info('processMessage', meta, route, messageString);
         assert.equal(await redis.sadd(this.config.queue.pending, messageString),
            1, 'sadd');
         return request({
            method: message.method || 'GET',
            url: message.url,
            json: message.json || true
         });
      } catch (err) {
         logger.error('processMessage', err.stack);
         return err;
      } finally {
         assert.equal(await redis.srem(this.config.queue.pending, messageString),
            1, 'srem');
      }
   }
}
