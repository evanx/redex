
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
      this.count = 0;
      logger.info('constructor', this.constructor.name, this.config, this.files);
      this.files.forEach(file => {
         logger.info('watch', file);
      });
      this.watch();
   }

   async watch() {
      try {
         let { fileEvent, fileName } = Files.watch(config.watchDir);
         if (fileEvent === 'change' && lodash.endsWith(fileName, '.yaml')) {
            logger.info('File changed:', fileEvent, fileName, this.config.route);
            this.fileEvent(event, fileName);
         } else {
            logger.info('Ignore file event:', fileEvent, fileName);
         }
         this.watch();
      } catch (err) {
         logger.warn('watch error:', err);
         setTimeout(this.watch, 1000);
      }
   }

   formatFileName(messageId) {
      return this.config.replyDir + messageId + '.json';
   }

   formatContent(object) {
      return JSON.stringify(object), null, 2) + '\n';
   }

   async fileEvent(event, fileName) {
      logger.info('fileEvent', event, fileName);
         try {
            let data = yaml.safeLoad(await Files.readFile(this.config.watchDir + fileName));
            this.count += 1;
            let messageId = path.basename(fileName, '.yaml') + '-' + this.count;
            let redixInfo = { messageId };
            let message = { data, redixInfo };
            let fileName = formatFileName(messageId);
            assert.equal(await Files.exists(fileName, false, 'File already exists: ' + fileName);
            processReply(messageId, redix.dispatchMessage(this.config, message, this.config.route));
         } catch (err) {
            processErrorReply(messageId, err);
         }
      }
   }

   processReply(messageId, reply) {
      logger.info('processReply', messageId, reply);
      try {
         Files.writeFile(formatFileName(messageId), formatContent(reply.data));
      } catch (err) {
         logger.info('processReply write error:', messageId, err);
      }
   }

   processReplyError(messageId, error) {
      logger.info('processErrorReply', messageId, error);
      try {
         Files.writeFile(formatFileName(messageId), formatContent(error));
      } catch (err) {
         logger.info('processReplyError write error:', messageId, err);
      }
   }

}
