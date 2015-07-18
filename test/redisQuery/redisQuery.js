// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

//console.log(module.filename);

import assert from 'assert';
import async from 'async';
import bunyan from 'bunyan';
import lodash from 'lodash';

import Loggers from '../../util/Loggers';
import Redis from '../../util/Redis';
import Promises from '../../util/Promises';

import RedisQuery from '../../lib/RedisQuery';

const logger = Loggers.create(module.filename);

const redis = new Redis();

const redisQuery = new RedisQuery();

const tests = {
   async set() {
      await redisQuery.execute({commands: [
         [ 'set', 'testkey', 'testvalue' ]
      ]});
   }
};

async function run() {
   console.info('tests:', Object.keys(tests).join(', '));
   try {
      await tests.set();
      await redis.end();
      redisQuery.end();
   } catch (e) {
      logger.error('error:', e);
   }
}

run().then(() => {
   console.info('OK');
}, err => {
   console.error('error:', err);
});
