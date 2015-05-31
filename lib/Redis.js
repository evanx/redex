
// a more explicit promisification for redis client

// also see more automated attempt using es6-promisify:
// https://github.com/evanx/redixrouter/blob/master/lib/redisPromisified.js

import redis from 'redis';
import bunyan from 'bunyan';
import lodash from 'lodash';

const logger = bunyan.createLogger({name: 'redisPromised', level: 'debug'});

function createClient() {
   let redisClient = redis.createClient();
   redisClient.on('error', err => {
     logger.error('redis error:', err);
   });
   return redisClient;
}

function createCallback(resolve, reject) {
   return (err, reply) => {
      if (err) {
         logger.debug('redis reject error:', err);
         reject(err);
      } else {
         logger.debug('redis resolve:', reply);
         resolve(reply);
      }
   };
}

function createPromise(fn) {
   return new Promise((resolve, reject) => fn(createCallback(resolve, reject)));
}

export default class Redis {

   constructor() {
      this.client = createClient();
   }

   set(key, value) {
      return createPromise(cb => this.client.set(key, value, cb));
   }

   get(key) {
      return createPromise(cb => this.client.get(key, cb));
   }

   hset(key, field, value) {
      return createPromise(cb => this.client.hset(key, field, value, cb));
   }

   hget(key, field) {
      return createPromise(cb => this.client.hget(key, field, cb));
   }

   hgetall(key) {
      return createPromise(cb => this.client.hgetall(key, cb));
   }

   lindex(key, index) {
      return createPromise(cb => this.client.lindex(key, index, cb));
   }

   lset(key, index, value) {
      return createPromise(cb => this.client.lset(key, index, value, cb));
   }

   llen(key) {
      return createPromise(cb => this.client.llen(key, cb));
   }

   ltrim(key, start, stop) {
      return createPromise(cb => this.client.ltrim(key, start, stop, cb));
   }

   lrange(key, start, stop) {
      return createPromise(cb => this.client.lrange(key, start, stop, cb));
   }

   lpush(key, value) {
      return createPromise(cb => this.client.lpush(key, value, cb));
   }

   rpush(key, value) {
      return createPromise(cb => this.client.rpush(key, value, cb));
   }

   lpop(key) {
      return createPromise(cb => this.client.lpop(key, cb));
   }

   rpop(key) {
      return createPromise(cb => this.client.rpop(key, cb));
   }

   blpop(key, timeout) {
      return createPromise(cb => this.client.blpop(key, timeout, cb));
   }

   brpop(key, timeout) {
      return createPromise(cb => this.client.brpop(key, timeout, cb));
   }

   rpoplpush(source, destination) {
      return createPromise(cb => this.client.rpoplpush(source, destination, cb));
   }

   brpoplpush(source, destination, timeout) {
      return createPromise(cb => this.client.brpoplpush(source, destination, timeout, cb));
   }

   zrange(key, stop, start) {
      return createPromise(cb => this.client.zrange(key, start, stop, cb));
   }

   zrevrange(key, stop, start) {
      return createPromise(cb => this.client.zrevrange(key, start, stop, cb));
   }

   // TODO all the rest, see https://github.com/mranney/node_redis/blob/master/lib/commands.js

   multi() {
      let multi = this.client.multi();
      multi.execCallback = multi.exec;
      multi.execPromise = () => {
         return createPromise(cb => multi.execCallback(cb));
      };
      multi.exec = multi.execPromise;
      return multi;
   }

   end() {
      this.client.end();
   }
}

// see test: https://github.com/evanx/redixrouter/blob/master/test/redisPromised.js
