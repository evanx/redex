
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redixrouter/LICENSE

import fs from 'fs';
import bunyan from 'bunyan';

const logger = bunyan.createLogger({name: 'Promises', level: global.redixLoggerLevel});

module.exports = {
   exists(filePath) {
      logger.debug('exists', filePath);
      return new Promise((resolve, reject) => {
         fs.exists(filePath, exists => {
            logger.debug('exists', filePath, {exists});
            resolve(exists);
         });
      });
   },
   watch(dir) {
      logger.debug('watch', dir);
      return new Promise((resolve, reject) => {
         fs.watch(dir, (fileEvent, filePath) => {
            logger.debug('watch', fileEvent, filePath);
            resolve([fileEvent, filePath]);
         });
      });
   },
   readFile(filePath) {
      logger.debug('readFile', filePath);
      return new Promise((resolve, reject) => {
         fs.readFile(filePath, (err, content) => {
            logger.debug('readFile', filePath, {err});
            if (err) {
               reject(err);
            } else {
               logger.debug('readFile resolve:', filePath, content.length);
               resolve(content);
            }
         });
      });
   },
   writeFile(filePath, content) {
      logger.debug('writeFile', filePath);
      return new Promise((resolve, reject) => {
         fs.writeFile(filePath, content, err => {
            logger.debug('writeFile', filePath, {err});
            if (err) {
               reject(err);
            } else {
               resolve();
            }
         });
      });
   }
};
