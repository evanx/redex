
import bunyan from 'bunyan';

const logger = bunyan.createLogger({name: 'Collections', level: global.redexLoggerLevel});


const that = {
   map(iterable, fn) {
      logger.info('map', typeof iterable);
      let array = [];
      for (let item of iterable) {
         logger.info('map item', typeof item, item, fn(item));
         array.push(fn(item));
      }
      return array;
   }
};

module.exports = that;
