
import fs from 'fs';
import path from 'path';
import bunyan from 'bunyan';
import yaml from 'js-yaml';
import lodash from 'lodash';

const { redix } = global;

const log = global.bunyan.createLogger({name: 'FileImporter', level: 'debug'});

export default class FileImporter {

   constructor(config) {
      this.config = config;
      this.files = fs.readdirSync(config.watchDir);
      this.count = 0;
      logger.info('constructor', this.constructor.name, this.config, this.files);
      this.files.forEach(file => {
         logger.info('watch', file);
      });
      this.watcher = fs.watch(config.watchDir, (event, fileName) =>
         this.fileEvent(event, fileName)
      );
   }

   fileEvent(event, fileName) {
      logger.info('fileEvent', event, fileName);
      if (event === 'change' && lodash.endsWith(fileName, '.yaml')) {
         logger.info('fileChanged', fileName, this.config.route);
         fs.readFile(this.config.watchDir + fileName, (err, content) => {
            if (err) {
               logger.warn('watchListener', err);
            } else {
               let data = yaml.safeLoad(content);
               this.count += 1;
               let messageId = path.basename(fileName, '.yaml') + '-' + this.count;
               let redixInfo = { messageId };
               let message = { data, redixInfo };
               redix.dispatchMessage(this.config, message, this.config.route);
            }
         });
      }
   }

   processReply(reply) {
      logger.info('processReply', reply);
      let content = JSON.stringify(reply.data, null, 2) + '\n';
      let fileName = this.config.replyDir + reply.redixInfo.messageId + '.json';
      fs.writeFile(fileName, content, err => {
         if (err) {

         } else {

         }
      });
   }

}
