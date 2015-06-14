
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redixrouter/LICENSE

import path from 'path';
import bunyan from 'bunyan';
import lodash from 'lodash';

const logger = bunyan.createLogger({name: 'Paths', level: global.redixLoggerLevel});

const mimeTypes = {
   html: 'text/html',
   txt: 'text/plain',
   jpeg: 'image/jpeg',
   jpg: 'image/jpeg',
   png: 'image/png'
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
   joinPath(dir, file) {
      if (lodash.endsWith(dir, '/') && lodash.startsWith(file, '/')) {
         return dir + file.substring(1);
      } else if (lodash.endsWith(dir, '/') || lodash.startsWith(file, '/')) {
         return dir + file;
      } else {
         return dir + '/' + file;
      }
   }
};
