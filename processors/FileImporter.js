
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
      log.info('constructor', this.config, this.files);
      this.files.forEach(file => {
         log.info('watch', file);
      });
      this.watcher = fs.watch(config.watchDir, (event, fileName) =>
         this.fileEvent(event, fileName)
      );
   }

   fileEvent(event, fileName) {
      log.info('fileEvent', event, fileName);
      if (event === 'change' && lodash.endsWith(fileName, '.yaml')) {
         log.info('fileChanged', fileName, this.config.route);
         fs.readFile(this.config.watchDir + fileName, (err, content) => {
            if (err) {
               log.warn('watchListener', err);
            } else {
               let message = yaml.safeLoad(content);
               message.meta = {
                  fileName: path.basename(fileName, '.yaml'),
                  routed: []
               };
               this.dispatchMessage(message);
            }
         });
      }
   }

   dispatchMessage(message) {
      redix.dispatchMessage(this.config, message);
   }

   processReply(reply) {
      log.info('processReply', reply);
      let content = JSON.stringify(reply.data, null, 2) + '\n';
      let fileName = this.config.replyDir + reply.meta.fileName + '.json';
      fs.writeFile(fileName, content, err => {
         if (err) {

         } else {

         }
      });
   }

}
