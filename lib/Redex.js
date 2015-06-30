
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';
import lodash from 'lodash';
import fs from 'fs';
import util from 'util';

import RedexProcessors from './RedexProcessors';

const logger = RedexGlobal.logger(module.filename);

export default class Redex {

   constructor(config) {
      assert(config.monitorInterval, 'monitorInterval');
      this.config = config;
      if (!config.baseDir) {
         logger.debug('no baseDir:', Object.keys(config).join(', '));
      }
      this.processorMap = new Map();
      this.processorKeys = []; // in startup order
      this.startedProcessorKeys = [];
      this.resolve = {
         routes: new Set(),
         processors: new Set(),
      };
      this.cancelled = config.env.cancelled;
      this.ended = false;
      this.pidFile = process.env.pidFile;
      this.startTimeout = config.startTimeout || 4000;
      logger.debug('constructor', this.constructor.name, this.config);
   }

   get lifecycle() {
      if (this.ended) {
         return 'ended';
      } else if (this.cancelled) {
         return 'cancelled';
      } else {
         return 'running';
      }
   }

   resolveRoute(route, sourceProcessor, message) {
      assert(lodash.isArray(route) && route.length && lodash.isString(route[0]), 'route');
      this.resolve.routes.add({route, sourceProcessor, message});
   }

   resolveProcessor(processorName, sourceProcessor, message) {
      assert(processorName, 'processorName');
      this.resolve.processors.add({processorName, sourceProcessor, message});
   }

   initProcessors() {
      for (let processorName of [...this.processorKeys]) {
         let processor = this.processorMap.get(processorName);
         assert(processor, processorName);
         if (lodash.isFunction(processor.init)) {
            logger.info('init', processorName);
            try {
               processor.init();
            } catch (err) {
               logger.error('init', processorName, err);
               throw err;
            }
         } else {
            logger.warn('init', processorName);
         }
      }
   }

   async startProcessors() {
      for (let processorName of [...this.processorKeys]) {
         let processor = this.processorMap.get(processorName);
         if (lodash.isFunction(processor.start)) {
            logger.info('start', processorName);
            try {
               await Promises.timeout(processorName, this.config.startTimeout, processor.start());
               this.startedProcessorKeys.push(processorName);
            } catch (err) {
               logger.error('start', processorName, err);
               throw err;
            }
         } else {
            logger.warn('start', processorName);
         }
      }
   }

   endProcessors() {
      for (let processorName of [...this.startedProcessorKeys]) {
         let processor = this.processorMap.get(processorName);
         if (lodash.isFunction(processor.end)) {
            logger.info('end', processorName);
            try {
               processor.end();
            } catch (err) {
               logger.error(err, 'end', processorName);
            }
         } else {
            logger.warn('end', processorName);
         }
      }
   }

   resolveProcessors() {
      logger.info('init resolve processors', this.resolve.processors.size);
      for (let {processorName, sourceProcessor, message} of this.resolve.processors) {
         logger.info('init resolve', processorName, sourceProcessor, message);
         if (!lodash.includes(this.processorKeys, processorName)) {
            throw {processorName, sourceProcessor, message};
         }
      }
      logger.info('init resolve routes', this.resolve.routes.size);
      for (let {route, sourceProcessor, message} of this.resolve.routes) {
         logger.info('init resolve', sourceProcessor, message, route);
         logger.warn('init first', lodash(route).filter(processorName => {
            logger.warn('init first', processorName, lodash.includes(this.processorKeys, processorName));
            return lodash.includes(this.processorKeys, processorName);
         }).isEmpty());
         let unresolvedName = lodash(route).filter(processorName =>
            !lodash.includes(this.processorKeys, processorName)).first();
            assert(!unresolvedName, unresolvedName);
      }
   }

   async start() {
      logger.info('start', this.config.env, this.config.configs.length);
      if (lodash.isEmpty(this.config.configs)) {
         logger.warn('start abort empty');
         return false;
      }
      RedexProcessors.createProcessors(this, this.config.configs);
      delete this.config.configs;
      this.initProcessors();
      this.resolveProcessors();
      await this.startProcessors();
      if (this.cancelled) {
         logger.warn('start cancelled', this.config);
         this.endProcessors();
         return false;
      }
      logger.info('started', this.config);
      if (process.env.pidFile) {
         fs.writeFile(process.env.pidFile, process.pid);
         logger.info('pid', process.pid);
      }
      this.monitorId = setInterval(() => this.monitor(), this.config.monitorInterval);
      return true;
   }

   end() {
      this.ended = true;
      this.endProcessors();
      clearInterval(this.monitorId);
      logger.info('end');
   }

   monitor() {
      logger.digest('monitor', this.lifecycle);
      if (this.shutdown) {
         this.end();
         logger.info('shutdown');
         setTimeout(() => {
            logger.warn('forced shutdown');
            process.exit(0);
         }, 8000);
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
      this.processorMap.set(processorName, processor);
      this.processorKeys.push(processorName);
   }

   getProcessor(processorName) {
      let processor = this.processorMap.get(processorName);
      if (!processor) {
         throw new Error('Missing processor: ' + processorName)
      }
      return processor;
   }

   async dispatch(message, meta, route) {
      logger.debug('dispatchMessage:', meta, route, this.processorMap.keys());
      assert(route.length, 'route length');
      let nextProcessorName = route[0];
      try {
         let nextProcessor = this.processorMap.get(nextProcessorName);
         assert(nextProcessor, 'nextProcessor: ' + nextProcessorName);
         return await nextProcessor.process(message, meta, route.slice(1));
      } catch (e) {
         logger.warn(e, 'dispatch', nextProcessorName);
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
         promise.then(resolve, reject).catch(e => {
            logger.warn(e, 'import', meta, options);
            throw e;
         });
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

}
