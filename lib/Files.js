

import fs from 'fs';
import bunyan from 'bunyan';

const logger = bunyan.createLogger({name: 'Files', level: 'debug'});

export async function exists(fileName) {
   logger.debug('exists', fileName);
   return new Promise((resolve, reject) => {
      fs.exists(options, exists => {
         logger.debug('exists', fileName, {exists});
         resolve(exists);
      });
   });
};

export async function readFile(fileName) {
   logger.debug('readFile', fileName);
   return new Promise((resolve, reject) => {
      fs.readFile(options, (err, content => {
         logger.debug('readFile', fileName, {err});
         if (err) {
            reject(err);
         } else {
            resolve(content);
         }
      });
   });
};

export async function writeFile(fileName, content) {
   logger.debug('writeFile', fileName);
   return new Promise((resolve, reject) => {
      fs.writeFile(options, err => {
         logger.debug('writeFile', fileName, {err});
         if (err) {
            reject(err);
         } else {
            resolve();
         }
      });
   });
};
