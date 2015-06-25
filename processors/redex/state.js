
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';
import lodash from 'lodash';
import path from 'path';

const Paths = RedexGlobal.require('util/Paths');
const RedexState = RedexGlobal.require('lib/RedexState');

const { redex } = RedexGlobal;

export default function state(config, redex, logger) {

   init();

   function init() {
      logger.info('start', config);
   }

   const service = {
      get state() {
         return { config: config.summary };
      },
      async process(message, meta, route) {
         assert('express', meta.type, 'express meta type');
         logger.debug('process', meta.type);
         let content = RedexState.render(redex);
         return {
            statusCode: 200,
            contentType: 'application/json',
            dataType: 'json',
            content: content
         }
      }
   };

   return service;
}
