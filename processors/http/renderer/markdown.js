
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)

// ISC license, see http://github.com/evanx/redex/LICENSE
import assert from 'assert';
import lodash from 'lodash';
import path from 'path';
import marked from 'marked';

const Paths = RedexGlobal.require('util/Paths');

export default function httpRendererMarkdown(config, redex, logger) {

   const service = {
      start() {
         logger.info('start', config);
      },
      get state() {
         return { config: config.summary };
      },
      async process(message, meta, route) {
         assert(meta.type, 'message type');
         assert.equal('express', meta.type, 'express message type');
         return redex.dispatch(message, meta, route).then(reply => {
            assert(meta, 'meta');
            if (meta.type === 'express') {
               assert(message.url, 'message url');
               assert(reply.contentType, 'reply contentType');
               logger.debug('renderer', reply.contentType, meta.filePath);
               if (lodash.endsWith(meta.filePath, '.md')) {
                  if (reply.contentType !== 'text/x-markdown') {
                     logger.warn('reply contentType', reply.contentType);
                     reply.contentType = 'text/x-markdown';
                  }
                     try {
                        logger.debug('reply content type', typeof reply.content, reply.content.constructor.name);
                        let content = reply.content.toString();
                        reply.content = marked(content);
                        reply.contentType = 'text/html';
                        reply.dataType = 'string';
                     } catch (e) {
                        let lines = e.message.split('\n');
                        if (lines.length) {
                           logger.info(e.message);
                           throw {message: 'marked error'};
                        } else {
                           throw e;
                        }
                     }
               }
            } else {
               logger.warn('message type', meta.type);
            }
            logger.info('reply', meta.filePath);
            return reply;
         });
      }
   };

   return service;
}
