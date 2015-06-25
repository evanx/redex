
import assert from 'assert';
import bunyan from 'bunyan';
import lodash from 'lodash';

const logger = RedexGlobal.logger(module.filename);

function decorateLabel(label) {
   if (label) {
      return lodash.trim(label);
   } else {
      return 'Empty label';
   }
}

function decorateMetaConfig(config) {
   config.label = decorateLabel(config.label);
   return config;
}

function decorateProcessorLabel(config) {
   assert(config.processorName, 'processorName');
   if (config.label) {
      return lodash.trim(config.label);
   } else if (config.route && config.route.length) {
      return config.processorName + ' routes to ' + config.route.join(', ');
   } else {
      return config.processorName;
   }
}

function summariseProcessorConfig(config) {
   let summary;
   if (config.label === config.processorName) {
      summary = Object.assign({}, config);
      delete summary.label;
   } else {
      summary = Object.assign({label: config.label}, config);
   }
   ['processorName', 'startup', 'instance', 'class', 'loggerLevel'].forEach(key => {
      delete summary[key];
   });
   if (Object.keys(summary).length) {
      return summary;
   } else {
      return undefined;
   }
}

function decorateProcessorConfig(config) {
   assert(config.processorName, 'processorName');
   if (!config.startup) {
      if (config.type === 'importer' ||
         config.processorName.indexOf('importer.') >= 0) {
         config.startup = 80;
      } else if (config.type === 'exporter' ||
            config.processorName.indexOf('exporter.') >= 0) {
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
      config.loggerLevel = RedexGlobal.loggerLevel;
   }
   config.label = decorateProcessorLabel(config);
   config.summary = summariseProcessorConfig(config);
   return config;
}

function createLogger(config) {
   return bunyan.createLogger({
      name: config.processorName,
      level: config.loggerLevel
   });
}

function createProcessor(redex, config) {
   logger.debug('createProcessor', config.processorName, config);
   let processor = require('../processors/' + config.class);
   try {
      if (/^[a-z]+\.[a-z]/.test(config.processorName)) {
         return processor(config, redex, createLogger(config));
      } else {
         return new processor(config, redex, createLogger(config));
      }
   } catch (e) {
      logger.warn(e, 'createProcessor', config.processorName);
      throw e;
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

module.exports = { createProcessors, decorateMetaConfig, summariseProcessorConfig };
