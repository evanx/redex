
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';
import bunyan from 'bunyan';
import lodash from 'lodash';

const logger = bunyan.createLogger({name: 'httpProxy', level: RedexGlobal.loggerLevel});
const Redis = RedexGlobal.require('lib/Redis');
const redis = new Redis();
const { request } = RedexGlobal.require('lib/Requests');

export default class httpProxy(config, redex, logger) {

   assert(config.address, 'address');

   const service = {
      get state() {
         return { config: config.summary };
      },
      async process(message, meta, route) {
         logger.debug('process', meta);
         return request({
            method: message.method || 'GET',
            url: message.url,
            json: message.json || true
         });
      }
   };

   return service;
}
