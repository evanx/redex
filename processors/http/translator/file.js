
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';
import lodash from 'lodash';
import path from 'path';

const { redex, requireRedexLib } = global;

const Paths = RedexGlobal.require('util/Paths');
const Files = RedexGlobal.require('util/Files');

export default function fileTranslator(config, redex, logger) {

   let count = 0;

   const service = {
      get state() {
         return { config: config.summary, count: count };
      },
      init() {
      },
      start() {
         logger.info('start', config);
      },
      end() {
         logger.info('end');
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
         if (typeof reply.data === 'string') {
         } else if (reply.data.constructor.name === 'Buffer') {
         } else {
            assert(false, 'reply data type unsupported: ' + typeof reply.data);
         }
         logger.debug('process reply:', reply.type);
         meta.filePath = fileMessage.path;
         let httpReply = {
            statusCode: 200,
            contentType: Paths.getContentType(path.extname(fileMessage.path)),
            content: reply.data
         }
         logger.debug('reply', httpReply.statusCode, httpReply.contentType, reply.data.length);
         return httpReply;
      }
   };

   return service;
}
