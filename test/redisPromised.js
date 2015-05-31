
import assert from 'assert';
import async from 'async';
import bunyan from 'bunyan';

const logger = bunyan.createLogger({name: 'test.redis', level: 'info'});

const redis = require('../lib/redisPromised');

logger.info('redis', Object.keys(redis));

function testKey(cb) {
   let key = 'redix:test:key';
   redis.set(key, 42).then(() => {
      redis.get(key).then(value => {
         logger.info('testKey', key, value);
         assert.equal(value, 42);
         cb();
      }, err => cb(err)).catch(error => {
         logger.error(error);
         cb(error);
      });
   });
}

function testList(cb) {
   let key = 'redix:test:list';
   logger.info('testList1', key);
   redis.lpush(key, 42).then(() => {
      logger.info('testList2', key);
      setTimeout(() => {
         logger.info('testList3', key);
         redis.lpop(key).then(value => {
            logger.info('testList4', key, value);
            assert.equal(value, 42);
            cb();
         }, err => cb(err)).catch(error => {
            logger.error(error);
            cb(error);
         });
      }, 0);
   });
}

function rpush(cb) {
   let key = 'redix:test:list';
   logger.info('rpush1', key);
   redis.rpush(key, 42).then(() => {
      logger.info('rpush2', key);
      setTimeout(() => {
         logger.info('rpush3', key);
         redis.lpop(key).then(value => {
            logger.info('rpush4', key, value);
            assert.equal(value, 42);
            cb();
         }, err => cb(err)).catch(error => {
            logger.error(error);
            cb(error);
         });
      }, 0);
   });
}

function testMulti() {
   let multi = redis.multi();
   assert.ok(multi._client === redisClient);
   multi.exec();
}

function test() {
   logger.info('exports', Object.keys(redis));
   async.series([testKey, testList, rpush], (err, replies) => {
      logger.info('test', err, replies);
   });
}

test();
