
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

export default function httpImporter(config) {

   const that = {};

   function construct() {
      assert(config.port, 'port');
      assert(config.timeout, 'timeout');
      assert(config.route, 'route');
      assert(config.loggerLevel, 'loggerLevel');
      that.logger = bunyan.createLogger({name: config.processorName, level: config.loggerLevel});
      that.config = config;
      that.seq = new Date().getTime();
      that.logger.info('constructor', that.constructor.name, that.config);
   }

   function start() {
      that.logger.debug('start', that.config.port);
      that.app = express();
      logger.info('config', exports.config);
      that.app.listen(that.config.port);
   }

   construct();

   const service = {

   };

   return service;
}
