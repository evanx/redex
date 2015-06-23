
import assert from 'assert';

const logger = RedexGlobal.logger(module.filename);

const that = {

   assert(value, message) {
      assert(value, message);
   },

   assertNumber(value, message) {
      assert(!isNaN(value), message);
   }
}

module.exports = that;
