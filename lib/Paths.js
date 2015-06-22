
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import path from 'path';
import bunyan from 'bunyan';
import lodash from 'lodash';

const logger = bunyan.createLogger({name: 'Paths', level: global.redexLoggerLevel});

const mimeTypes = {
   md: 'text/x-markdown',
   html: 'text/html',
   txt: 'text/plain',
   json: 'application/json',
   js: 'text/javascript',
   css: 'text/css',
   ico: 'image/x-icon',
   jpeg: 'image/jpeg',
   jpg: 'image/jpeg',
   png: 'image/png',
   svg: 'image/svg+xml',
   otf: 'application/font-sfnt',
   ttf: 'application/font-sfnt',
   eot: 'application/vnd.ms-fontobject',
   woff: 'application/font-woff'
};

const defaultContentType = 'application/octet-stream';

module.exports = {
   defaultContentType: defaultContentType,
   getContentType(ext) {
      if (!ext.length) {
         return null;
      }
      ext = ext.toLowerCase().substring(1);
      logger.debug('ext', ext);
      if (mimeTypes.hasOwnProperty(ext)) {
         return mimeTypes[ext];
      }
      return defaultContentType;
   },
   join(dir, file) {
      //console.debug('join', dir, file);
      if (lodash.endsWith(dir, '/') && lodash.startsWith(file, '/')) {
         return dir + file.substring(1);
      } else if (lodash.endsWith(dir, '/') || lodash.startsWith(file, '/')) {
         return dir + file;
      } else {
         return dir + '/' + file;
      }
   }
};
