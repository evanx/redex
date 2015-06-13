
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

const { redix } = global;

export default function fileServer(config) { // trying processor constructor without class

   assert(config.root, 'root');
   if (!config.index) {
      config.index = 'index.html';
   }
   var seq = new Date().getTime();

   logger = bunyan.createLogger({name: config.processorName, level: config.loggerLevel});

   const service = { // public methods
      getState() {
         return { config, seq };
      },
      async process(req) {
         logger.info('req', req);
         throw {message: 'not implemented'};
      }
   };

   return service;
}
