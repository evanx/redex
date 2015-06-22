
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';
import bunyan from 'bunyan';
import lodash from 'lodash';

const Redis = RedexGlobal.require('lib/Redis');
const Asserts = RedexGlobal.require('lib/Asserts');
const { request } = RedexGlobal.require('lib/Requests');
const { redex } = RedexGlobal;

const logger = bunyan.createLogger({name: 'HttpExporter', level: RedexGlobal.loggerLevel});
const redis = new Redis();

export default class HttpExporter {

   constructor(config) {
      Asserts.assert(!config.route, 'route');
      Asserts.assert(config.queue.pending);
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
