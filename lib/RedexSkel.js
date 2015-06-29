
import assert from 'assert';
import bunyan from 'bunyan';
import lodash from 'lodash';

import RedexFiles from './RedexFiles';

const logger = RedexGlobal.logger(module.filename);

const Skel = {
   a() {
   }
}

module.exports = Skel;
