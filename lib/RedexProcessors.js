
import assert from 'assert';
import util from 'util';

import RedexFiles from './RedexFiles';
import RedexConfigDecorations from './RedexConfigDecorations';
import RedexProcessorConfigs from './RedexProcessorConfigs';

let logger = RedexGlobal.logger(module.filename);

const RedexProcessors = {
   createProcessor(redex, config) {
      logger.debug('createProcessor', config.processorName, config);
      let decoratorFile = RedexFiles.formatClassYaml('processors', config.class);
      if (Files.existsFileSync(decoratorFile)) {
         let decoration = YamlFiles.readFileSync(decoratorFile);
         config = RedexConfigDecorations.decorate(decoration, config);
         RedexConfigDecorations.assert(decoration, config, config.processorName);
      } else {
         logger.warn('decoration', config.processorName, decoratorFile);
      }
      let classFile = RedexFiles.formatClassFile('processors', config.class);
      assert(Files.existsFileSync(classFile), classFile);
      let processor = require(classFile);
      let processorLogger = Loggers.create(config.processorName, config.loggerLevel);
      try {
         if (/^[a-z]+\.[a-z]/.test(config.processorName)) {
            return processor(config, redex, processorLogger);
         } else {
            return new processor(config, redex, processorLogger);
         }
      } catch (e) {
         logger.warn(e, 'createProcessor', config);
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
