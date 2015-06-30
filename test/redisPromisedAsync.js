
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

//console.log(module.filename);

import assert from 'assert';
import async from 'async';
import bunyan from 'bunyan';
import lodash from 'lodash';

import Loggers from '../util/Loggers';
import Redis from '../util/Redis';
import Promises from '../util/Promises';

const logger = Loggers.create('redisPromised');

const redis = new Redis();

const tests = {
   async empty() {
      let key = 'redex:test:empty:key';
      let value = await redis.get(key);
      assert.equal(value, null);
      logger.info('empty', key);
   },
   async key() {
      let key = 'redex:test:key';
      let delReply = await redis.del(key);
      let emptyValue = await redis.get(key);
      assert.equal(emptyValue, null);
      let value = await redis.set(key, 42);
      assert.equal(value, 'OK');
      logger.info('key', key, value);
   },
   async lpush() {
      let key = 'redex:test:list';
      await redis.lpush(key, 42);
      let value = await redis.lpop(key);
      assert.equal(value, 42);
      logger.info('lpush', key, value);
   },
   async rpush() {
      let key = 'redex:test:list';
      await redis.rpush(key, 42);
      let value = await redis.rpop(key);
      assert.equal(value, 42);
      logger.info('rpush', key, value);
   },
   async multi() {
      let multi = redis.multi();
      assert.ok(multi._client === redis.client);
      multi.set('redex:test:multi:key', 43);
      multi.get('redex:test:multi:key');
      multi.lpush('redex:test:multi:list', 44);
      multi.llen('redex:test:multi:list');
      multi.lpop('redex:test:multi:list');
      let replies = await multi.exec();
      logger.info('multi', replies.toString());
      assert.equal(replies[0], 'OK');
      assert.equal(replies[1], 43);
      assert.equal(replies[2], 1);
      assert.equal(replies[3], 1);
      assert.equal(replies[4], 44);
   },
   async run() {
      console.info('tests:', Object.keys(tests).join(', '));
      try {
         await tests.empty();
         await tests.key();
         await tests.lpush();
         await tests.rpush();
         await tests.multi();
         await redis.end();
         await Promises.delay(1000);
         console.info('tests OK');
      } catch (e) {
         logger.error('error:', e);
      }
   }
};

function start() {
   tests.run().then(() => {
      console.info('test then OK');
   }, err => {
      console.error('error:', err);
   });
}

start();
