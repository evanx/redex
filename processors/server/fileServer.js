
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
   if (!config.index) {
      config.index = 'index.html';
   }
   if (!lodash.startsWith(config.root, '/')) {
      config.root = Paths.joinPath(redix.config.baseDir, config.root);
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
         assert(message.path, 'file path');
         let data = await Files.readFile(Paths.joinPath(config.root, message.path));
         return {
            type: 'data',
            dataType: 'string',
            data: data
         };
      }
   };

   return service;
}
