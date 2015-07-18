// Copyright (c) 2015, Evan Summers (twitter.com/evanxsummers)
// ISC license, see http://github.com/evanx/redex/LICENSE

const Promises = RedexGlobal.require('util/Promises');
const Redis = RedexGlobal.require('util/Redis');

export default class Query {
   redis = new Redis({});
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
      this.logger.debug('message', meta, req.url, req.method);
      this.count += 1;
      assert.equal(meta.type, 'express', 'supported message type: ' + meta.type);
      try {
         return {
            statusCode: 200,
            contentType: 'application/json',
            dataType: 'object',
            content: { url: req.url, method: req.method, count: this.count }
         };
      } catch (err) {
         this.logger.debug('error:', err);
         throw err;
      }
   }
}
