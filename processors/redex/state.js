
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';
import bunyan from 'bunyan';
import lodash from 'lodash';
import path from 'path';

import Paths from '../../lib/Paths';
import RedexState from '../../lib/RedexState';

const { redex } = global;

export default function state(config, redex) {

   var logger;

   logger = bunyan.createLogger({name: config.processorName, level: config.loggerLevel});

   init();

   function init() {
      logger.info('start', config);
   }

   const service = {
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
