
import RedexProcessorConfigs from './RedexProcessorConfigs';

let logger = RedexGlobal.logger(module.filename);

const RedexProcessors = {
   createProcessor(redex, config) {
      logger.debug('createProcessor', config.processorName, config);
      let processor = require('../processors/' + config.class);
      let processorLogger = Loggers.create(config.processorName, config.loggerLevel);
      try {
         if (/^[a-z]+\.[a-z]/.test(config.processorName)) {
            return processor(config, redex, processorLogger);
         } else {
            return new processor(config, redex, processorLogger);
         }
      } catch (e) {
         logger.warn(e, 'createProcessor', config.processorName);
         throw e;
      }
   },
   createProcessors(redex, configs) {
      logger.info('createProcessors', configs.map(config => config.processorName));
      configs.map(RedexProcessorConfigs.decorate).sort((a, b) =>
         a.startup > b.startup
      ).forEach(config => {
         logger.info('createProcessors', config.processorName);
         redex.setProcessor(config.processorName,
            RedexProcessors.createProcessor(redex, config));
      });
   }
};

module.exports = RedexProcessors;
