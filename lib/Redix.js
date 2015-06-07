
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redixrouter/LICENSE

import fs from 'fs';
import assert from 'assert';
import bunyan from 'bunyan';

const logger = bunyan.createLogger({name: 'redix', level: global.redixLoggerLevel});

export default class Redix {

   constructor(config) {
      this.config = config;
      this.processors = new Map();
      logger.info('constructor', this.constructor.name);
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

   async processMessage(messageId, route, message) {
      logger.info('processMessage:', messageId, route);
      let processor = this.processors.get(route[0]);
      if (!processor) {
         throw new Error('Missing processor: ' + processorName);
      }
      return processor.processMessage(messageId, route.slice(1), message);
   }

   assert(value, message) {
      assert(value, message);
   }

   assertNumber(value, message) {
      assert(!isNaN(value), message);
   }

}
