
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redixrouter/LICENSE

import assert from 'assert';
import bunyan from 'bunyan';
import fs from 'fs';
import util from 'util';

const logger = bunyan.createLogger({name: 'redix', level: global.redixLoggerLevel});

export default class Redix {

   constructor(config) {
      this.config = config;
      this.processors = new Map();
      logger.info('constructor', this.constructor.name, this.config);
      if (process.env.pidFile) {
         fs.writeFile(process.env.pidFile, process.pid);
         logger.info('pid', process.pid);
      }
      setInterval(this.monitor, 1000);
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

   async dispatchMessage(message, meta, route) {
      logger.debug('dispatchMessage:', meta, route, this.processors.keys());
      let nextProcessorName = route[0];
      let nextProcessor = this.processors.get(nextProcessorName);
      assert(nextProcessor, 'Invalid processor: ' + nextProcessorName);
      return nextProcessor.processMessage(message, meta, route.slice(1));
   }

   async importMessage(message, meta, options) {
      logger.debug('importMessage:', meta);
      assert(options.processorName, 'processorName');
      assert(options.route, 'route');
      assert(options.timeout, 'timeout');
      meta.route = options.route;
      meta.importer = options.processorName;
      meta.expires = new Date().getTime() + options.timeout;
      let promise = this.dispatchMessage(message, meta, options.route);
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

   assert(value, message) {
      assert(value, message);
   }

   assertNumber(value, message) {
      assert(!isNaN(value), message);
   }

}
