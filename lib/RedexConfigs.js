
import assert from 'assert';
import bunyan from 'bunyan';
import lodash from 'lodash';

const logger = bunyan.createLogger({name: 'RedexConfigs', level: global.redexLoggerLevel});

function decorateDescription(description) {
   if (description) {
      return lodash.trim(description);
   } else {
      return 'Empty description';
   }
}

function decorateMetaConfig(config) {
   config.description = decorateDescription(config.description);
   return config;
}

function decorateProcessorDescription(config) {
   assert(config.processorName, 'processorName');
   if (config.description) {
      return lodash.trim(config.description);
   } else if (config.route && config.route.length) {
      return config.processorName + ' routes to ' + config.route.join(', ');
   } else {
      return config.processName;
   }
}

function decorateProcessorConfig(config) {
   assert(config.processorName, 'processorName');
   if (!config.startup) {
      if (config.type === 'importer' ||
         config.processorName.indexOf('importer') === 0) {
         config.startup = 80;
      } else if (config.type === 'exporter' ||
            config.processorName.indexOf('exporter') === 0) {
         config.startup = 20;
      } else {
         config.startup = 50;
      }
   }
   if (!config.class) {
      let matcher = config.processorName.match(/(.*)\.([^\.]+)/);
      config.class = matcher[1].replace(/\./g, '/');
      config.instance = matcher[2];
   }
   if (!config.loggerLevel) {
      config.loggerLevel = global.redexLoggerLevel;
   }
   config.description = decorateProcessorDescription(config);
   return config;
}

function createProcessor(redex, config) {
   logger.debug('createProcessor', config.processorName, config);
   let processor = require('../processors/' + config.class);
   if (/^[a-z]+\.[a-z]/.test(config.processorName)) {
      return processor(config, redex);
   } else {
      return new processor(config, redex);
   }
}

function createProcessors(redex, configs) {
   logger.info('createProcessors', configs.map(config => config.processorName));
   configs.map(decorateProcessorConfig).sort((a, b) =>
      a.startup > b.startup
   ).forEach(config => {
      logger.info('createProcessors', config.processorName);
      redex.setProcessor(config.processorName, createProcessor(redex, config));
   });
}

module.exports = { createProcessors, decorateMetaConfig };
