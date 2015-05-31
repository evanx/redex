
import promisify from 'es6-promisify';
import redis from 'redis';
import bunyan from 'bunyan';
import lodash from 'lodash';

export const redisClient = redis.createClient();
const logger = bunyan.createLogger({name: 'redisPromisified', level: 'info'});

function bindName(name) {
   logger.debug('bindName', name);
   return redisClient[name].bind(redisClient);
}

function promisifyName(name) {
   logger.debug('promisifyName', name);
   return promisify(bindName(name));
}

function exportProperty(prop) {
   logger.debug('export', prop);
   exports[prop.key] = prop.value;
}

function createProperty(fn) {
   return function(key) {
      return {
         key: key,
         value: fn(key)
      };
   };
}

lodash.map(
   ['set', 'get', 'hgetall', 'lrange', 'lpush', 'lpop', 'brpop', 'zrevrange'],
   createProperty(promisifyName)
).forEach(exportProperty);

lodash.map(
   ['end'],
   createProperty(bindName)
).forEach(exportProperty);
