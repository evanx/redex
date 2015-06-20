
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redixrouter/LICENSE

import assert from 'assert';
import bunyan from 'bunyan';
import lodash from 'lodash';
import path from 'path';

import Paths from '../../lib/Paths';
import Files from '../../lib/Files';

const { redix } = global;

export default function expressFile(config, redix) {

   var seq = new Date().getTime();
   var logger;

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
         if (!meta.type) {
            throw {message: 'No meta type'};
         } else if (meta.type !== 'express') {
            throw {message: 'Unsupported type: ' + meta.type};
         }
         let transMessage = {
            path: message.url
         };
         let transMeta = {
            translator: config.processorName,
            type: 'file',
            orig: meta
         };
         let reply = await redix.dispatch(transMessage, transMeta, route);
         assert(reply, 'empty reply');
         assert(reply.type, 'no reply type');
         assert(reply.type === 'data', 'reply type not data');
         assert(reply.dataType === 'string', 'reply data type not string');
         logger.debug('process reply:', {type: reply.type, keys: Object.keys(reply)});
         meta.filePath = transMessage.path;
         return {
            statusCode: 200,
            contentType: Paths.getContentType(path.extname(transMessage.path)),
            contentDataType: reply.dataType,
            content: reply.data
         }
      }
   };

   return service;
}
