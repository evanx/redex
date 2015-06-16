
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redixrouter/LICENSE

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import bunyan from 'bunyan';
import yaml from 'js-yaml';
import lodash from 'lodash';
import express from 'express';

import Files from '../../lib/Files';
import Paths from '../../lib/Paths';

const { redix } = global;

export default function fileServer(config, redix) { // trying processor constructor without class

   assert(config.root, 'root');
   if (!lodash.startsWith(config.root, '/')) {
      if (redix.config.baseDir) {
         config.root = Paths.joinPath(redix.config.baseDir, config.root);
      } else {
         config.root = Paths.joinPath(process.cwd(), config.root);         
      }
   }
   var seq = new Date().getTime();
   var logger;

   logger = bunyan.createLogger({name: config.processorName, level: config.loggerLevel});

   const service = { // public methods
      getState() {
         return { config, seq };
      },
      async process(message, meta) {
         logger.info('message', meta);
         if (!meta.type) {
            throw {message: 'no type'};
         } else if (meta.type !== 'file') {
            throw {message: 'unsupported type: ' + meta.type};
         }
         if (message.path === '/') {
            if (!config.index) {
               throw {message: 'no root index'};
            } else {
               message.path = config.index;
            }
         }
         assert(message.path, 'file path');
         let filePath = Paths.joinPath(config.root, message.path);
         try {
            let stats = await Files.stat(filePath);
            logger.debug('stats', filePath, {dir: stats.isDirectory(), file: stats.isFile()});
            if (stats.isDirectory()) {
               if (!config.index) {
                  throw {message: 'no index: ' + message.path};
               } else {
                  filePath = Paths.joinPath(filePath, config.index);
               }
            }
            logger.debug('filePath', filePath);
            let data = await Files.readFile(filePath);
            return {
               type: 'data',
               dataType: 'string',
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
