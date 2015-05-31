
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
   hset(key, field, value) {
      return createPromise(cb => redisClient.hset(key, field, value, cb));
   },
   hget(key, field) {
      return createPromise(cb => redisClient.hget(key, field, cb));
   },
   hgetall(key) {
      return createPromise(cb => redisClient.hgetall(key, cb));
   },
   lindex(key, index) {
      return createPromise(cb => redisClient.lindex(key, index, cb));
   },
   lset(key, index, value) {
      return createPromise(cb => redisClient.lset(key, index, value, cb));
   },
   llen(key) {
      return createPromise(cb => redisClient.llen(key, cb));
   },
   ltrim(key, start, stop) {
      return createPromise(cb => redisClient.ltrim(key, start, stop, cb));
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
   rpop(key) {
      return createPromise(cb => redisClient.rpop(key, cb));
   },
   blpop(key, timeout) {
      return createPromise(cb => redisClient.blpop(key, timeout, cb));
   },
   brpop(key, timeout) {
      return createPromise(cb => redisClient.brpop(key, timeout, cb));
   },
   rpoplpush(source, destination) {
      return createPromise(cb => redisClient.rpoplpush(source, destination, cb));
   },
   brpoplpush(source, destination, timeout) {
      return createPromise(cb => redisClient.brpoplpush(source, destination, timeout, cb));
   },
   zrange(key, stop, start) {
      return createPromise(cb => redisClient.zrange(key, start, stop, cb));
   },
   zrevrange(key, stop, start) {
      return createPromise(cb => redisClient.zrevrange(key, start, stop, cb));
   },
   // TODO all the rest, see https://github.com/mranney/node_redis/blob/master/lib/commands.js
   multi() {
      let multi = redisClient.multi();
      multi.execCallback = multi.exec;
      multi.execPromise = () => {
         return createPromise(cb => multi.execCallback(cb));
      };
      multi.exec = multi.execPromise;
      return multi;
   },
   end() {
      redisClient.end();
   }
};

// see test: https://github.com/evanx/redixrouter/blob/master/test/redisPromised.js
