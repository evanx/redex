
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)

// ISC license, see http://github.com/evanx/redex/LICENSE
import assert from 'assert';
import bunyan from 'bunyan';
import lodash from 'lodash';
import path from 'path';
import marked from 'marked';

const Paths = requireRedex('lib/Paths');

const { redex } = global;

export default function markdown(config, redex) {

   var logger;

   logger = bunyan.createLogger({name: config.processorName, level: config.loggerLevel});

   init();

   function init() {
      logger.info('start', config);
   }

   const service = {
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
                  if (reply.contentType == 'application/octet-stream') {
                     logger.warn('reply contentType', reply.contentType);
                     reply.contentType = 'text/plain';
                  }
                  if (reply.contentType !== 'text/plain') {
                     logger.warn('reply contentType', reply.contentType);
                  } else {
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
               }
            } else {
               logger.warn('message type', meta.type);
            }
            return reply;
         });
      }
   };

   return service;
}
