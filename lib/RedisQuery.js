
// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

import assert from 'assert';
import lodash from 'lodash';

import Loggers from '../util/Loggers';
import Redis from '../util/Redis';

const logger = Loggers.create(module.filename, 'debug');

const commands = {
   set: {
      paramsLength: 2
   }
};

export default class RedisQuery {

   constructor(namespace) {
      this.namespace = namespace;
      this.redis = new Redis();
   }

   end() {
      this.redis.end();
   }

   async execute(query) {
      logger.debug('execute', query);
      assert(lodash.isArray(query.commands), 'commands');
      let replies = await* query.commands.map(async (params) => {
         logger.debug('execute', params);
         assert(lodash.isArray(params), 'params');
         assert(lodash.includes(Object.keys(commands), params[0]), 'command: ' + params[0]);
         let commandInfo = commands[params[0]];
         assert.equal(params.length - 1, commandInfo.paramsLength, 'params length: ' + params[0]);
         if (params[0] === 'set') {
            logger.debug('execute set', params[1]);
            await this.redis.set(params[1], params[2]);
         }
         return params;
      });
      return { query, replies };
   }
}
