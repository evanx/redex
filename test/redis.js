
import assert from 'assert';
import bunyan from 'bunyan';

const logger = bunyan.createLogger({name: 'test.redis', level: 'info'});

const redis = global.redisPromisified;

logger.info('redis', Object.keys(redis));

function testKey() {
   let key = 'redix:test:key';
   redis.set(key, 42).then(() => {
      redis.get(key).then(value => {
         logger.info('testKey', key, value);
         assert.equal(value, 42);
      }).catch(error => {
         logger.error(error);
      });
   });
}

function testList() {
   let key = 'redix:test:list';
   logger.info('testList1', key);
   redis.lpush(key, 42).then(() => {
      logger.info('testList2', key);
      setTimeout(() => {
         logger.info('testList3', key);
         redis.lpop(key).then(value => {
            logger.info('testList4', key, value);
            assert.equal(value, 42);
         }).catch(error => {
            logger.error(error);
         });
      }, 1000);
   });
}

function testMulti() {
   let multi = redis.multi();
   assert.ok(multi._client === redisClient);
   multi.exec();
}

function test() {
   logger.info('exports', Object.keys(redis));
   testKey();
   testList();
}

test();
