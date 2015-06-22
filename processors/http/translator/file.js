
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';
import bunyan from 'bunyan';
import lodash from 'lodash';
import path from 'path';

const { redex, requireRedex } = global;

const Paths = requireRedex('lib/Paths');
const Files = requireRedex('lib/Files');

export default function fileTranslator(config, redex) {

   let startTime = new Date().getTime();
   let count = 0;
   let logger = bunyan.createLogger({name: config.processorName, level: config.loggerLevel});

   init();

   function init() {
      logger.info('start', config);
   }

   const service = {
      get state() {
         return { config, count };
      },
      async process(message, meta, route) {
         count += 1;
         if (!meta.type) {
            throw {message: 'No meta type'};
         } else if (meta.type !== 'express') {
            throw {message: 'Unsupported type: ' + meta.type};
         }
         let fileMessage = {
            path: message.url
         };
         let fileMeta = {
            translator: config.processorName,
            type: 'file',
            orig: meta
         };
         let reply = await redex.dispatch(fileMessage, fileMeta, route);
         assert(reply, 'reply');
         assert(reply.type, 'reply type');
         assert(reply.type === 'data', 'reply type not data: ' + reply.type);
         if (reply.dataType === 'string') {
         } else if (reply.dataType === 'Buffer') {
         } else {
            assert(false, 'reply data type unsupported: ' + reply.dataType);
         }
         logger.debug('process reply:', {type: reply.type, dataType: reply.dataType, keys: Object.keys(reply)});
         meta.filePath = fileMessage.path;
         return {
            statusCode: 200,
            contentType: Paths.getContentType(path.extname(fileMessage.path)),
            dataType: reply.dataType,
            content: reply.data
         }
      }
   };

   return service;
}
