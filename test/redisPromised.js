
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

// see alternative reimplementation using ES7 async functions (with await keyword):
// https://github.com/evanx/redex/blob/master/test/redisPromisedAsync.js

console.log(module.filename);

import RedexGlobal from '../lib/RedexGlobal';

const logger = RedexGlobal.logger('redisPromised');

import assert from 'assert';
import async from 'async';
import bunyan from 'bunyan';
import lodash from 'lodash';
import Redis from '../util/Redis';

const redis = new Redis();

const redisClient = redis.client;

var tests = {
   key(cb) {
      let key = 'redex:test:key';
      redis.set(key, 42).then(() => {
         redis.get(key).then(value => {
            logger.info('tests:key', key, value);
            assert.equal(value, 42);
            cb(null, 'ok');
         }, err => cb(err)).catch(error => {
            logger.error('tests:key', error);
            cb(error);
         });
      });
   },
   getEmpty(cb) {
      let key = 'redex:test:empty:key';
      redis.get(key).then(value => {
         logger.info('tests:getEmpty', key, value);
         assert.equal(value, null);
         cb(null, 'ok');
      }, err => {
         logger.info('tests:getEmpty err', key, err);
         cb(err);
      }).catch(error => {
         logger.error('tests:getEmpty', error);
         cb(error);
      });
   },
   lpush(cb) {
      let key = 'redex:test:list';
      logger.info('tests:lpush1', key);
      redis.lpush(key, 42).then(() => {
         logger.info('tests:lpush2', key);
         setTimeout(() => {
            logger.info('tests:lpush3', key);
            redis.lpop(key).then(value => {
               logger.info('tests:lpush4', key, value);
               assert.equal(value, 42);
               cb(null, 'ok');
            }, err => cb(err)).catch(error => {
               logger.error('tests:lpush', error);
               cb(error);
            });
         }, 0);
      });
   },
   rpush(cb) {
      let key = 'redex:test:list';
      logger.info('rpush1', key);
      redis.rpush(key, 42).then(() => {
         logger.info('rpush2', key);
         setTimeout(() => {
            logger.info('rpush3', key);
            redis.lpop(key).then(value => {
               logger.info('rpush4', key, value);
               assert.equal(value, 42);
               cb(null, 'ok');
            }, err => cb(err)).catch(error => {
               logger.error('rpush', error);
               cb(error);
            });
         }, 0);
      });
   },
   multiStandard(cb) {
      let multi = redisClient.multi();
      assert.ok(multi._client === redisClient);
      multi.set('redex:test:multi:key', 43);
      multi.get('redex:test:multi:key');
      multi.lpush('redex:test:multi:list', 44);
      multi.llen('redex:test:multi:list');
      multi.lpop('redex:test:multi:list');
      multi.exec((err, replies) => {
         logger.info('exec', err || 'ok', replies);
         assert.equal(replies[0], 'OK');
         assert.equal(replies[1], 43);
         assert.equal(replies[2], 1);
         assert.equal(replies[3], 1);
         assert.equal(replies[4], 44);
         cb(err, replies);
      });
   },
   multiCallback(cb) {
      let multi = redis.multi();
      assert.ok(multi._client === redisClient);
      multi.set('redex:test:multi:key', 43);
      multi.get('redex:test:multi:key');
      multi.lpush('redex:test:multi:list', 44);
      multi.llen('redex:test:multi:list');
      multi.lpop('redex:test:multi:list');
      multi.execCallback((err, replies) => {
         logger.info('exec', err || 'ok', replies);
         assert.equal(replies[0], 'OK');
         assert.equal(replies[1], 43);
         assert.equal(replies[2], 1);
         assert.equal(replies[3], 1);
         assert.equal(replies[4], 44);
         cb(err, replies);
      });
   },
   multiPromise(cb) {
      let multi = redis.multi();
      assert.ok(multi._client === redisClient);
      multi.set('redex:test:multi:key', 43);
      multi.get('redex:test:multi:key');
      multi.lpush('redex:test:multi:list', 44);
      multi.llen('redex:test:multi:list');
      multi.lpop('redex:test:multi:list');
      multi.execPromise().then(replies => {
         logger.info('exec', replies);
         assert.equal(replies[0], 'OK');
         assert.equal(replies[1], 43);
         assert.equal(replies[2], 1);
         assert.equal(replies[3], 1);
         assert.equal(replies[4], 44);
         cb(null, replies);
      }, err => cb(err)).catch(error => cb(error));
   }
}

function done(err, replies) {
   logger.info('test:', err || 'ok', replies);
   redis.end();
   setTimeout(() => {
      if (err) {
         process.stdout.write('redisPromised: FAIL\n');
      } else {
         process.stdout.write('redisPromised: OK\n');
      }
   }, 1000);
}

function test() {
   console.info('tests:', Object.keys(tests).join(', '));
   let array = Object.keys(tests).map(name => tests[name]);
   async.series(array, done);
}

test();
