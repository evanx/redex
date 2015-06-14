
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redixrouter/LICENSE

import assert from 'assert';
import bunyan from 'bunyan';

import Redis from '../../lib/Redis';

const logger = bunyan.createLogger({name: 'RedisExporter', level: global.redixLoggerLevel});

const redis = new Redis();

export default class RedisExporter {

   constructor(config) {
      assert(config.queue.out, 'queue.out');
      assert(!config.queue.in, 'queue.in');
      assert(!config.route, 'route');
      this.config = config;
      logger.info('constructor', this.constructor.name, this.config);
   }

   formatMessage(message) {
      if (this.config.json) {
         return JSON.stringify(message);
      } else {
         return message.toString();
      }
   }

   async process(message, meta, route) {
      let string = this.formatMessage(message);
      logger.debug('promise lpush:', meta, this.config.queue.out, string);
      await redis.lpush(this.config.queue.out, string);
      return;
   }
}
