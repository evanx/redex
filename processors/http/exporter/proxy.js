
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';
import lodash from 'lodash';

const { request } = RedexGlobal.require('util/Requests');

export default function getProxy(config, redex, logger) {

   assert(config.address, 'address');

   const service = {
      get state() {
         return { config: config.summary };
      },
      async process(message, meta, route) {
         logger.debug('process', meta, message.method);
         assert.equal(message.method, 'GET', 'get method');
         assert(message.uri, 'uri');
         assert.equals(message.uri[0], '/', 'uri start');
         const options = {
            method: 'GET',
            url: 'http://' + address + message.uri,
            json: message.json
         };
         return request(options);
      }
   };

   return service;
}
