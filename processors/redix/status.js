
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';
import bunyan from 'bunyan';
import lodash from 'lodash';
import path from 'path';

import Paths from '../../lib/Paths';

const { redex } = global;

export default function status(config, redex) {

   var logger;

   logger = bunyan.createLogger({name: config.processorName, level: config.loggerLevel});

   init();

   function init() {
      logger.info('start', config);
   }

   const service = {
      async process(message, meta, route) {
         assert('express', meta.type, 'express meta type');
         let content = {};
         return {
            statusCode: 200,
            contentType: 'application/json',
            dataType: 'string',
            content: content
         }
      }
   };

   return service;
}
