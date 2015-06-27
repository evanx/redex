
import assert from 'assert';
import bunyan from 'bunyan';
import lodash from 'lodash';

import RedexConfigs from './RedexConfigs';

const logger = RedexGlobal.logger(module.filename);

function decorateLabel(label) {
   if (label) {
      return lodash.trim(label);
   } else {
      return 'Empty label';
   }
}

function decorate(config) {
   config.label = decorateLabel(config.label);
   return config;
}


module.exports = { decorate };
