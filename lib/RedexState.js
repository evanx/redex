
import bunyan from 'bunyan';
import lodash from 'lodash';

import Collections from './Collections';

const logger = bunyan.createLogger({name: 'RedexState', level: global.redexLoggerLevel});

const that = {
   render(redix) {
      return {
         config: redix.config,
         processors: Collections.map(redix.processors, ([processorName, processor]) => {
            logger.debug('processorName', processorName, typeof processor.state, Object.keys(processor.state));
            if (processor.state) {
               return Object.assign({processorName}, {state: processor.state});
            } else {
               return { processorName };
            }
         })
      }
   }
};

module.exports = that;
