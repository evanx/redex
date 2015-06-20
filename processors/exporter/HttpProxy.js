
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redexrouter/LICENSE

import assert from 'assert';
import bunyan from 'bunyan';
import lodash from 'lodash';

import { request } from '../../lib/Requests';
import Redis from '../../lib/Redis';

const redis = new Redis();

const logger = bunyan.createLogger({name: 'HttpProxy', level: global.redexLoggerLevel});

const { redex } = global;

export default class HttpProxy {

   constructor(config) {
      assert(config.address, 'address');
      this.config = config;
      logger.info('constructor', this.constructor.name, this.config);
   }

   async process(message, meta, route) {
      logger.debug('process', meta);
      return request({
          method: message.method || 'GET',
          url: message.url,
          json: message.json || true
      });
   }
}
