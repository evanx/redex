
import assert from 'assert';
import bunyan from 'bunyan';

const logger = bunyan.createLogger({name: 'test.redis', level: 'info'});

const redis = global.redisPromisified;

function testKey() {
   redis.set('redix:test:key', 42).then(() => {
      redis.get('redix:test:key').then(value => {
         assert.equal(value, 42);
      }).catch(error => {
         logger.error(error);
      });
   });
}

function testList() {
   redis.lpush('redix:test:list', 42).then(() => {
      redis.lpop('redix:test:list').then(value => {
         assert.equal(value, 42);
      }).catch(error => {
         logger.error(error);
      });
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
