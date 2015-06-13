
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redixrouter/LICENSE

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import bunyan from 'bunyan';
import yaml from 'js-yaml';
import lodash from 'lodash';
import express from 'express';
import Files from '../lib/Files';

const { redix } = global;

export default function httpImporter(config) { // trying processor constructor without class

   const that = {}; // internal state

   var logger, app;
   var seq = new Date().getTime();

   function construct() {
      assert(config.port, 'port');
      assert(config.timeout, 'timeout');
      assert(config.route, 'route');
      assert(config.loggerLevel, 'loggerLevel');
      logger = bunyan.createLogger({name: config.processorName, level: config.loggerLevel});
      logger.info('constructor', that.config);
   }

   function start() {
      logger.debug('start', that.config.port);
      app = express();
      app.listen(that.config.port);
   }

   construct();

   const service = { // public methods

   };

   return service;
}
