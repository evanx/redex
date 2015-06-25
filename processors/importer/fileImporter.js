
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import lodash from 'lodash';

const Files = RedexGlobal.require('util/Files');

export default function fileImporter(config, redex, logger) {

   let count = 0;

   start();

   function start() {
      assert(config.watchDir, 'watchDir');
      assert(config.replyDir, 'replyDir');
      assert(config.timeout, 'timeout');
      assert(config.route, 'route');
      watch();
   }

   async function watch() {
      logger.debug('watch', config.watchDir);
      try {
         let [ fileEvent, fileName ] = await Files.watch(config.watchDir);
         if (fileEvent === 'change' && lodash.endsWith(fileName, '.yaml')) {
            logger.debug('File changed:', fileEvent, fileName, config.route);
            fileChanged(fileName);
         } else {
            logger.debug('Ignore file event:', fileEvent, fileName);
         }
         setTimeout(() => watch(), 0);
      } catch (err) {
         logger.warn('watch error:', err.stack);
         setTimeout(() => watch(), 1000);
      }
   }

   function formatReplyFilePath(messageId) {
      return config.replyDir + messageId + '.json';
   }

   function formatJsonContent(object) {
      return JSON.stringify(object, null, 2) + '\n';
   }


   async function fileChanged(fileName) {
      let filePath = config.watchDir + fileName;
      count += 1;
      let messageId = path.basename(fileName, '.yaml') + '-' + count;
      logger.debug('fileChanged', filePath, messageId);
      try {
         let message = yaml.safeLoad(await Files.readFile(filePath));
         logger.debug('message:', filePath, message);
         var replyFilePath = formatReplyFilePath(messageId);
         let exists = await Files.exists(replyFilePath);
         assert.equal(exists, false, 'File already exists: ' + replyFilePath);
         let reply = await redex.import(message, {messageId}, config);
         Files.writeFile(replyFilePath, formatJsonContent(reply));
         logger.debug('replyFilePath', replyFilePath);
      } catch (err) {
        logger.warn('fileChanged error:', err);
         Files.writeFile(replyFilePath, formatJsonContent(error));
      }
   }

   const service = {
      get state() {
         return { config: config.summary, count: count };
      },
   };

   return service;
}
