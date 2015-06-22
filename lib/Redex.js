
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';
import bunyan from 'bunyan';
import lodash from 'lodash';
import fs from 'fs';
import util from 'util';

const logger = bunyan.createLogger({name: 'redex', level: global.redexLoggerLevel});

export default class Redex {

   constructor(config) {
      this.config = config;
      if (!config.baseDir) {
         logger.debug('no baseDir:', Object.keys(config).join(', '));
      }
      this.processors = new Map();
      this.resolve = {
         routes: new Set(),
         processors: new Set(),
      };
      logger.debug('constructor', this.constructor.name, this.config);
      if (process.env.pidFile) {
         fs.writeFile(process.env.pidFile, process.pid);
         logger.info('pid', process.pid);
      }
      setInterval(this.monitor, 1000);
   }

   resolveRoute(route, sourceProcessor, message) {
      assert(lodash.isArray(route) && route.length && lodash.isString(route[0]), 'route');
      this.resolve.routes.add({route, sourceProcessor, message});
   }

   resolveProcessor(processorName, sourceProcessor, message) {
      assert(processorName, 'processorName');
      this.resolve.processors.add({processorName, sourceProcessor, message});
   }

   init() {
      for (let {route, sourceProcessor, message} of this.resolve.routes) {
         logger.info('init', sourceProcessor, message);
      }
      for (let {route, sourceProcessor, message} of this.resolve.processors) {
         logger.info('init', sourceProcessor, message);
      }
   }

   monitor() {
      if (this.shutdown) {
         process.exit(0);
      }
      if (process.env.pidFile) {
         fs.exists(process.env.pidFile, exists => {
            if (!exists) {
               this.shutdown = true;
            }
         });
      }
   }

   setProcessor(processorName, processor) {
      this.processors.set(processorName, processor);
   }

   getProcessor(processorName) {
      let processor = this.processors.get(processorName);
      if (!processor) {
         throw new Error('Missing processor: ' + processorName)
      }
      return processor;
   }

   async dispatch(message, meta, route) {
      logger.debug('dispatchMessage:', meta, route, this.processors.keys());
      assert(route.length, 'route length');
      let nextProcessorName = route[0];
      try {
         let nextProcessor = this.processors.get(nextProcessorName);
         assert(nextProcessor, 'nextProcessor: ' + nextProcessorName);
         return await nextProcessor.process(message, meta, route.slice(1));
      } catch (e) {
         logger.warn('dispatch', nextProcessorName);
         throw e;
      }
   }

   async import(message, meta, options) {
      logger.debug('import', meta);
      assert(options.processorName, 'processorName');
      assert(options.route, 'route');
      assert(options.timeout, 'timeout');
      meta.route = lodash(options.route).slice(1).dropRight(1).value();
      meta.importer = options.processorName;
      meta.expires = new Date().getTime() + options.timeout;
      let promise = this.dispatch(message, meta, options.route);
      return new Promise((resolve, reject) => {
         promise.then(resolve, reject);
         setTimeout(() => {
            reject({
               name: 'Timeout',
               message: util.format('%s timeout (%dms)', meta.importer, options.timeout)
            });
         }, options.timeout);
      });
   }

   async forward(message, meta, options, route) {
      logger.debug('forward', meta, options, route);
      assert(options.processorName, 'processorName');
      assert(route, 'route');
      meta.forward = route;
      meta.forwarder = options.processorName;
      return this.dispatch(message, meta, route);
   }

   assert(value, message) {
      assert(value, message);
   }

   assertNumber(value, message) {
      assert(!isNaN(value), message);
   }

}
