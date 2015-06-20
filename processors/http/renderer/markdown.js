
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)

// ISC license, see http://github.com/evanx/redixrouter/LICENSE
import assert from 'assert';
import bunyan from 'bunyan';
import lodash from 'lodash';
import path from 'path';
import marked from 'marked';

import Paths from '../../../lib/Paths';

const { redix } = global;

export default function markdown(config, redix) {

   var logger;

   logger = bunyan.createLogger({name: config.processorName, level: config.loggerLevel});

   init();

   function init() {
      logger.info('start', config);
   }

   const service = {
      async process(message, meta, route) {
         assert(meta.type, 'message type');
         assert.equal('express', meta.type, 'express message type');
         return redix.dispatch(message, meta, route).then(reply => {
            assert(meta, 'meta');
            if (meta.type === 'http') {
               assert(message.url, 'message url');
               assert(reply.contentType, 'reply contentType');
               logger.info('renderer', reply.contentType);
               if (lodash.endsWith(message.url, '.md')) {
                  if (reply.contentType !== 'text/plain') {
                     logger.warn('reply contentType', reply.contentType);
                  } else {
                     reply.content = marked(reply.content);
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
