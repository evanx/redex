
import promisify from 'es6-promisify';
import redis from 'redis';
import bunyan from 'bunyan';
import assert from 'assert';

const redisClient = redis.createClient();
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
   ['exec', 'set', 'get', 'hgetall', 'lrange', 'zrevrange', 'brpop'],
   createProperty(promisifyName)
).forEach(exportProperty);

lodash.map(
   ['multi', 'end'],
   createProperty(bindName)
).forEach(exportProperty);

function test() {
   logger.info('exports', Object.keys(exports));
   exports.set('redix:test', 42).then(() => {
      exports.get('redix:test').then(value => {
         assert.equal(value, 42);
      }).catch(error => {
         logger.error(error);
      });
   });
   assert.ok(exports.multi()._client === redisClient);
}

test();
