
import assert from 'assert';
import bunyan from 'bunyan';
import lodash from 'lodash';

const logger = RedexGlobal.logger(module.filename);

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
   ['processorName', 'startup', 'instance', 'class', 'loggerLevel', 'summary'].forEach(key => {
      delete summary[key];
   });
   if (Object.keys(summary).length) {
      return summary;
   } else {
      return undefined;
   }
}

function decorate(config) {
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

module.exports = { decorate, summariseProcessorConfig };
