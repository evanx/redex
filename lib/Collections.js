

const logger = RedexGlobal.logger(module.filename);

const that = {
   map(iterable, fn) {
      //logger.debug('map', typeof iterable);
      let array = [];
      for (let item of iterable) {
         //logger.debug('map item', typeof item, item, fn(item));
         array.push(fn(item));
      }
      return array;
   }
};

module.exports = that;
