
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import bunyan from 'bunyan';
import yaml from 'js-yaml';
import lodash from 'lodash';
import express from 'express';

const Paths = requireRedex('lib/Paths');
const Files = requireRedex('lib/Files');

const { redex } = global;

export default function create(config, redex) {

   assert(config.root, 'root');

   let startTime = new Date().getTime();
   let logger = bunyan.createLogger({name: config.processorName, level: config.loggerLevel});
   let count = 0;

   if (lodash.startsWith(config.root, '/')) {
   } else if (config.root === '.') {
      config.root = process.cwd();
   } else {
      if (lodash.startsWith(config.root, './')) {
         config.root = config.root.substring(2);
      }
      if (redex.config.baseDir) {
         config.root = Paths.join(redex.config.baseDir, config.root);
         logger.info('root relative to baseDir: ' + config.root);
      } else {
         config.root = Paths.join(process.cwd(), config.root);
         logger.info('root relative to cwd: ' + config.root);
      }
   }

   logger.info('start', config);

   const service = { // public methods
      get state() {
         return { config, count };
      },
      async process(message, meta) {
         //logger.debug('message', meta);
         count += 1;
         if (!meta.type) {
            throw {message: 'no type'};
         } else if (meta.type !== 'file') {
            throw {message: 'unsupported type: ' + meta.type};
         }
         assert(message.path.indexOf('..') < 0, 'valid path');
         if (message.path === '/') {
            if (!config.index) {
               throw {message: 'no root index'};
            } else {
               message.path = config.index;
            }
         }
         assert(message.path, 'file path');
         let filePath = Paths.join(config.root, message.path);
         try {
            let stats = await Files.stat(filePath);
            logger.debug('stats', filePath, {dir: stats.isDirectory(), file: stats.isFile()});
            if (stats.isDirectory()) {
               if (!config.index) {
                  throw {message: 'no index: ' + message.path};
               } else {
                  filePath = Paths.join(filePath, config.index);
               }
            }
            let data = await Files.readFile(filePath);
            logger.debug('filePath', filePath, data.constructor.name);
            return {
               type: 'data',
               dataType: 'Buffer',
               data: data
            };
         } catch (e) {
            logger.debug('file error:', filePath);
            throw e;
         }
      }
   };

   return service;
}
