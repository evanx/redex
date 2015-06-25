
import assert from 'assert';

import Loggers from './Loggers';

const logger = Loggers.create(module.filename);

const that = {

   assert(value, message) {
      assert(value, message);
   },

   assertNumber(value, message) {
      assert(!isNaN(value), message);
   }
}

module.exports = that;
