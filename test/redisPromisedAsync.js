
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redixrouter/LICENSE

global.redixLoggerLevel = 'debug';

import assert from 'assert';
import async from 'async';
import bunyan from 'bunyan';
import lodash from 'lodash';

import Redis from '../lib/Redis';
import Promises from '../lib/Promises';

const logger = bunyan.createLogger({name: 'test.redis', level: global.redixLoggerLevel});

const redis = new Redis();

async function empty() {
   let key = 'redix:test:empty:key';
   let value = await redis.get(key);
   assert.equal(value, null);
   logger.info('empty', key);
}

async function key() {
   let key = 'redix:test:key';
   logger.info('key', key);
   let delReply = await redis.del(key);
   logger.info('delReply', delReply);
   let emptyValue = await redis.get(key);
   logger.info('emptyValue', emptyValue);
   assert.equal(emptyValue, null);
   logger.info('emptyValue', emptyValue);
   let value = await redis.set(key, 42);
   assert.equal(value, 'OK');
   logger.info('key', key, value);
}

async function lpush() {
   let key = 'redix:test:list';
   logger.info('tests:lpush', key);
   await redis.lpush(key, 42);
   //await Promises.delay(1000);
   let value = await redis.lpop(key);
   assert.equal(value, 42);
   logger.info('lpush', key, value);
}

async function rpush() {
   let key = 'redix:test:list';
   logger.info('tests:lpush', key);
   await redis.rpush(key, 42);
   let value = await redis.rpop(key);
   assert.equal(value, 42);
   logger.info('rpush', key, value);
}

async function multi() {
   let multi = redis.multi();
   assert.ok(multi._client === redis.client);
   multi.set('redix:test:multi:key', 43);
   multi.get('redix:test:multi:key');
   multi.lpush('redix:test:multi:list', 44);
   multi.llen('redix:test:multi:list');
   multi.lpop('redix:test:multi:list');
   let replies = await multi.exec();
   logger.info('multi', replies.toString());
   assert.equal(replies[0], 'OK');
   assert.equal(replies[1], 43);
   assert.equal(replies[2], 1);
   assert.equal(replies[3], 1);
   assert.equal(replies[4], 44);
}

async function test() {
   try {
      await empty();
      await key();
      await lpush();
      await rpush();
      await multi();
      await redis.end();
      await Promises.delay(1000);
      console.info('test try OK');
   } catch (e) {
      logger.error('error:', e);
   }
}

test().then(() => {
   console.info('test then OK');
}, err => {
   console.error('error:', err);

});
