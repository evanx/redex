
import promisify from 'es6-promisify';
import redis from 'redis';
import bunyan from 'bunyan';
import lodash from 'lodash';

export const redisClient = redis.createClient();

const logger = bunyan.createLogger({name: 'redisPromisified', level: 'info'});

redisClient.on("error", err => log.error("redis error:", err));

function createCallback(resolve, reject) {
   return (err, reply) => {
      if (err) {
         reject(err);
      } else {
         resolve(reply);
      }
   };
}

function createPromise(fn) {
   return new Promise((resolve, reject) => fn(createCallback(resolve, reject)));
}

module.exports = {
   set(key, value) {
      return createPromise(cb => redisClient.set(key, value, cb));
   },
   get(key) {
      return createPromise(cb => redisClient.get(key, cb));
   },
   hgetall(key) {
      return createPromise(cb => redisClient.hgetall(key, cb));
   },
   lrange(key, start, stop) {
      return createPromise(cb => redisClient.lrange(key, start, stop, cb));
   },
   lpush(key, value) {
      return createPromise(cb => redisClient.lpush(key, value, cb));
   },
   lpop(key) {
      return createPromise(cb => redisClient.lpop(key, cb));
   },
   brpop(key, timeout) {
      return createPromise(cb => redisClient.brpop(key, timeout, cb));
   },
   zrevrange(key, stop, start) {
      return createPromise(cb => redisClient.zrevrange(key, start, stop, cb));
   },
   end() {
      redisClient.end();
   }
};

function test() {
   global.redisPromisified = module.exports;
   require('../test/redis');
}

//test();
