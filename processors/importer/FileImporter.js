
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import bunyan from 'bunyan';
import yaml from 'js-yaml';
import lodash from 'lodash';

import Files from '../../lib/Files';

const { redex } = global;

const logger = bunyan.createLogger({name: 'FileImporter', level: global.redexLoggerLevel});


export default class FileImporter {

   constructor(config) {
      assert(config.watchDir, 'watchDir');
      assert(config.replyDir, 'replyDir');
      assert(config.timeout, 'timeout');
      assert(config.route, 'route');
      this.config = config;
      this.count = 0;
      logger.info('constructor', this.constructor.name, this.config);
      this.watch();
   }

   async watch() {
      logger.debug('watch', this.config.watchDir);
      try {
         let [ fileEvent, fileName ] = await Files.watch(this.config.watchDir);
         if (fileEvent === 'change' && lodash.endsWith(fileName, '.yaml')) {
            logger.debug('File changed:', fileEvent, fileName, this.config.route);
            this.fileChanged(fileName);
         } else {
            logger.debug('Ignore file event:', fileEvent, fileName);
         }
         setTimeout(() => this.watch(), 0);
      } catch (err) {
         logger.warn('watch error:', err.stack);
         setTimeout(() => this.watch(), 1000);
      }
   }

   formatReplyFilePath(messageId) {
      return this.config.replyDir + messageId + '.json';
   }

   formatJsonContent(object) {
      return JSON.stringify(object, null, 2) + '\n';
   }

   async fileChanged(fileName) {
      let filePath = this.config.watchDir + fileName;
      this.count += 1;
      let messageId = path.basename(fileName, '.yaml') + '-' + this.count;
      logger.debug('fileChanged', filePath, messageId);
      try {
         let message = yaml.safeLoad(await Files.readFile(filePath));
         logger.debug('message:', filePath, message);
         var replyFilePath = this.formatReplyFilePath(messageId);
         let exists = await Files.exists(replyFilePath);
         assert.equal(exists, false, 'File already exists: ' + replyFilePath);
         let reply = await redex.import(message, {messageId}, this.config);
         Files.writeFile(replyFilePath, this.formatJsonContent(reply));
         logger.debug('replyFilePath', replyFilePath);
      } catch (err) {
        logger.warn('fileChanged error:', err);
         Files.writeFile(replyFilePath, this.formatJsonContent(error));
      }
   }

}
