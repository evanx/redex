
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import path from 'path';
import bunyan from 'bunyan';
import lodash from 'lodash';

const logger = bunyan.createLogger({name: 'Paths', level: global.redexLoggerLevel});

const mimeTypes = {
   html: 'text/html',
   txt: 'text/plain',
   jpeg: 'image/jpeg',
   jpg: 'image/jpeg',
   png: 'image/png'
   json: 'text/json',
   txt: 'text/plain',
   html: 'text/html',
   ico: 'image/x-icon',
   css: 'text/css',
   js: 'text/javascript',
   woff: 'application/font-woff',
   svg: 'image/svg+xml',
   otf: 'application/font-sfnt',
   ttf: 'application/font-sfnt',
   eot: 'application/vnd.ms-fontobject'
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
