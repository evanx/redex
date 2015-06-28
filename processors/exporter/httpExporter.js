
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';
import lodash from 'lodash';

const Redis = RedexGlobal.require('util/Redis');
const Asserts = RedexGlobal.require('util/Asserts');
const { request } = RedexGlobal.require('util/Requests');

export default function httpExporter(config, redex, logger) {

   Asserts.assert(!config.route, 'route');
   Asserts.assert(config.queue.pending);

   let redis;

   const service = {
      get state() {
         return { config: config.summary };
      },
      start() {
         redis = new Redis();
      },
      stop() {
         redis.end();
      },
      async process(message, meta, route) {
         try {
            var messageString = JSON.stringify(message);
            logger.debug('promise', meta, route, messageString);
            assert.equal(await redis.sadd(config.queue.pending, messageString),
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
            assert.equal(await redis.srem(config.queue.pending, messageString),
                  1, 'srem');
         }
      }
   };

   return service;
}
