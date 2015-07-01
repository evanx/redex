
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
   let cancelled = false;

   function formatReplyFilePath(messageId) {
      return config.replyDir + messageId + '.json';
   }

   function formatJsonContent(object) {
      return JSON.stringify(object, null, 2) + '\n';
   }

   async function fileChanged(fileName) {
      let file = config.watchDir + fileName;
      count += 1;
      let messageId = path.basename(fileName, '.yaml') + '-' + count;
      logger.debug('fileChanged', file, messageId);
      try {
         let message = yaml.safeLoad(await Files.readFile(file));
         logger.debug('message:', file, message);
         var replyFilePath = formatReplyFilePath(messageId);
         let exists = await Files.existsFile(replyFilePath);
         assert.equal(exists, false, 'File already exists: ' + replyFilePath);
         let reply = await redex.import(message, {messageId}, config);
         Files.writeFile(replyFilePath, formatJsonContent(reply)).catch(logger.warn);
         logger.debug('replyFilePath', replyFilePath);
      } catch (err) {
         logger.warn('fileChanged error:', err);
         Files.writeFile(replyFilePath, formatJsonContent(error)).catch(logger.warn);
         throw err;
      }
   }

   async function watch() {
      logger.info('watch', config.watchDir);
      let { fileEvent, fileName } = await Files.watch(config.watchDir, config.watchTimeout);
      logger.debug('watch', fileEvent, fileName);
      if (fileEvent === 'change' && lodash.endsWith(fileName, '.yaml')) {
         logger.debug('File changed:', fileEvent, fileName, config.route);
         await fileChanged(fileName);
      } else {
         logger.debug('Ignore file event:', fileEvent, fileName);
      }
   }

   async function run() {
      while (!cancelled) {
         try {
            await watch();
         } catch (err) {
            logger.warn(err);
            await Promises.delay(config.errorDelay);
         }
      }
      logger.warn('cancelled');
   }

   const service = {
      init() {
         assert(config.watchDir, 'watchDir');
         assert(config.replyDir, 'replyDir');
         assert(config.timeout, 'timeout');
         assert(config.route, 'route');
      },
      start() {
         setTimeout(() => run(), 0);
      },
      end() {
         cancelled = true;
      },
      get state() {
         return { config: config.summary, count: count };
      },
   };

   return service;
}
