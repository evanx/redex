
import redis from 'redis';
import bunyan from 'bunyan';
import lodash from 'lodash';

const redisClient = redis.createClient();

const logger = bunyan.createLogger({name: 'redisPromised', level: 'debug'});

redisClient.on("error", err => {
   logger.error("redis error:", err);
});

function createCallback(resolve, reject) {
   return (err, reply) => {
      if (err) {
         logger.debug("redis reject error:", err);
         reject(err);
      } else {
         logger.debug("redis resolve:", reply);
         resolve(reply);
      }
   };
}

function createPromise(fn) {
   return new Promise((resolve, reject) => fn(createCallback(resolve, reject)));
}

module.exports = {
   redisClient: redisClient,
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
   rpush(key, value) {
      return createPromise(cb => redisClient.rpush(key, value, cb));
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
