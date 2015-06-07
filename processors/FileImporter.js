
// Copyright (c) 2015, Evan Summers (@evanxsummers)
// ISC license, see http://github.com/evanx/redixrouter/LICENSE

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import bunyan from 'bunyan';
import yaml from 'js-yaml';
import lodash from 'lodash';

import Files from '../lib/Files';

const { redix } = global;

const logger = bunyan.createLogger({name: 'FileImporter', level: 'debug'});


export default class FileImporter {

   constructor(config) {
      redix.assert(config.watchDir, 'watchDir');
      redix.assert(config.replyDir, 'replyDir');
      redix.assert(config.route, 'route');
      this.config = config;
      this.files = fs.readdirSync(config.watchDir);
      this.count = new Date().getTime();
      logger.info('constructor', this.constructor.name, this.config, this.files);
      this.files.forEach(file => {
         logger.info('watch', file);
      });
      logger.info('watch', this.config.watchDir);
      this.watch();
   }

   async watch() {
      logger.info('watch', this.config.watchDir);
      try {
         logger.info('watch', this.config, Files);
         let [ fileEvent, fileName ] = await Files.watch(this.config.watchDir);
         if (fileEvent === 'change' && lodash.endsWith(fileName, '.yaml')) {
            logger.info('File changed:', fileEvent, fileName, this.config.route);
            this.fileChanged(fileName);
         } else {
            logger.info('Ignore file event:', fileEvent, fileName);
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
      logger.info('fileChanged', filePath, messageId);
      try {
         let message = yaml.safeLoad(await Files.readFile(filePath));
         logger.debug('message:', filePath, message);
         var replyFilePath = this.formatReplyFilePath(messageId);
         let exists = await Files.exists(replyFilePath);
         logger.info('replyFilePath', replyFilePath);
         assert.equal(exists, false, 'File already exists: ' + replyFilePath);
         let reply = await redix.processMessage(messageId, this.config.route, message);
         Files.writeFile(replyFilePath, this.formatJsonContent(reply));
      } catch (err) {
         Files.writeFile(replyFilePath, this.formatJsonContent(error));
      }
   }

}
