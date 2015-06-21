
import bunyan from 'bunyan';
import lodash from 'lodash';

import Collections from './Collections';

const logger = bunyan.createLogger({name: 'RedexState', level: global.redexLoggerLevel});

const that = {
   render(redix) {
      return {
         config: redix.config,
         processors: Collections.map(redix.processors, ([processorName, processor]) => {
            //logger.debug('processorName', processorName);
            let state = null;
            if (lodash.isFunction(processor.getState)) {
               state = processor.getState();
            }
            return { processorName, state };
         })
      }
   }
};

module.exports = that;