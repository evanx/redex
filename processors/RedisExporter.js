
// Copyright (c) 2015, Evan Summers (@evanxsummers)
// ISC license, see http://github.com/evanx/redixrouter/LICENSE

import assert from 'assert';
import bunyan from 'bunyan';
import Redis from '../lib/Redis';

const logger = bunyan.createLogger({name: 'RedisExporter', level: 'debug'});

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

   async processMessage(messageId, route, message) {
      let string = this.formatMessage(message);
      logger.info('processMessage lpush:', messageId, this.config.queue.out, string);
      await redis.lpush(this.config.queue.out, string);
      return;
   }
}
