
import bunyan from 'bunyan';

import Collections from '../util/Collections';

const logger = RedexGlobal.logger(module.filename);

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
