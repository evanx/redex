// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

const Promises = RedexGlobal.require('util/Promises');
const Redis = RedexGlobal.require('util/Redis');

const RedisQuery = RedexGlobal.require('lib/RedisQuery');

export default class PostQuery {
   count = 0;

   constructor(config, redex, logger) {
      this.config = config;
      this.logger = logger;
   }

   init() {
      this.logger.info('init', this.config);
   }

   start() {
      this.logger.info('start', this.config);
   }

   end() {
      this.logger.info('end');
   }

   get state() {
      return { config: this.config.summary, count: this.count };
   }

   async process(req, meta) {
      assert(req.method, 'POST');
      assert.equal(meta.type, 'express', 'supported message type: ' + meta.type);
      this.logger.debug('message', meta, req.url);
      this.count += 1;
      try {
         let reply = await RedisQuery.execute(req.body);
         return {
            statusCode: 200,
            contentType: 'application/json',
            content: reply
         };
      } catch (err) {
         this.logger.debug('error:', err);
         throw err;
      }
   }
}
