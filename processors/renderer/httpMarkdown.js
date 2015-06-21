
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';
import bunyan from 'bunyan';
import lodash from 'lodash';
import path from 'path';
import marked from 'marked';

import Paths from '../../lib/Paths';

const { redex } = global;

export default function httpMarkdown(config, redex) {

   var seq = new Date().getTime();
   var logger, app;

   logger = bunyan.createLogger({name: config.processorName, level: config.loggerLevel});

   init();

   function init() {
      logger.info('start', config);
   }

   const service = {
      getState() {
         return { config, seq };
      },
      async process(message, meta, route) {
         assert(meta.type, 'message type');
         assert.equal('express', meta.type, 'express message type');

         let transMessage = {
            path: message.url
         };
         let transMeta = {
            translator: config.processorName,
            type: 'file',
            orig: meta
         };
         let reply = await redex.dispatch(transMessage, transMeta, route);
         assert(reply, 'reply');
         assert.equal(reply.type, 'data', 'data reply type');
         assert.equal(reply.dataType, 'string', 'string reply data');
         logger.debug('process reply:', {type: reply.type, keys: Object.keys(reply)});
         return {
            statusCode: 200,
            contentType: Paths.getContentType(path.extname(transMessage.path)),
            dataType: reply.dataType,
            content: reply.data
         }
      }
   };

   return service;
}
