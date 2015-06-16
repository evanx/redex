### Redix routing

Importers are configured with a `route` in YAML as follows:
```yaml
description: Import a message from a Redis queue
queue:
  in: redix:test:dispatcher:in # the redis key for the incoming queue
  reply: redix:test:dispatcher:reply # the redis key for reply reque
  pending: redix:test:dispatcher:pending # the queue for pending requests

timeout: 8000 # ms
route:
- HttpRequestValidator.singleton
- RateLimitFilter.singleton
- RedisExporter.singleton
```
where `route` is an array of processor names.

Importers `await` a reply as follows:
```javascript
export default class RedisImporter {

   async pop() {
      const message = await this.redis.brpoplpush(this.config.queue.in,
         this.config.queue.pending, this.popTimeout);
      const messageId = this.getNextMessageId();
      try {
         this.addedPending(message, messageId);
         let reply = await redix.import(message, {messageId}, this.config);
         await this.redis.lpush(this.config.queue.reply, this.stringifyReply(reply));
         this.removePending(message, messageId, reply);
      } catch (err) {
         await this.redis.lpush(this.config.queue.error, message);
         this.revertPending(message, messageId, err);
         throw err;
      }
```

Our `redix.importMessage` utility chains a timeout promise:
```javascript
export default class Redix {

   async import(message, meta, options) {
      let importer = options.processorName;
      meta.expires = new Date().getTime() + options.timeout;
      let promise = this.dispatch(message, meta, options.route);
      return new Promise((resolve, reject) => {
         promise.then(resolve, reject);
         setTimeout(() => {
            reject({
               name: 'Timeout',
               message: util.format('%s timeout (%dms)', importer, options.timeout)
            });
         }, options.timeout);
      });
```
where ES7 `async` functions always return an ES6 `Promise.`

Other processors return a promise to reply later:
```javascript
export default class RateLimitFilter {

   async process(message, meta, route) {
      logger.debug('promise:', meta);
      this.count += 1;
      if (this.count > this.config.limit) {
         throw {message: 'Limit exceeded'};
      } else {
         return redix.dispatch(message, meta, route);
      }
   }
```
where we throw an exception to reject the message. (This is equivalent to the promise being rejected.)

Otherwise we invoke the `redix.dispatchMessage` utility function to invoke the next processor in the route and return its promise.

```javascript
export default class Redix {

   async dispatch(message, meta, route) {
      let nextProcessorName = route[0];
      let nextProcessor = this.processors.get(nextProcessorName);
      assert(nextProcessor, 'nextProcessor: ' + nextProcessorName);
      return nextProcessor.process(message, meta, route.slice(1));
   }
```

The importer therefore gets a chain of promises, from its own timeout promise, through to an exporters promise.

Incidently, we can intercept the reply via `then` as follows:

```javascript
export default class RateLimitFilter {

   async process(message, meta, route) {
      logger.debug('promise:', meta, route);
      this.count += 1;
      if (this.count > this.config.limit) {
         await this.redis.lpush(this.config.queue.drop, JSON.stringify(message));
         throw {message: 'Limit exceeded'};
      } else {
         return redix.dispatch(message, meta, route).then(reply => {
            logger.debug('promise reply:', meta); // intercept reply
            return reply;
         });
      }
   }
```

#### Reply and error handling

In the event of a timeout or some other error, this exception is caught by the importer as follows:
```javascript
   const message = await this.redis.brpoplpush(this.config.queue.in,
      this.config.queue.pending, this.popTimeout);
   const messageId = this.getNextMessageId();
   try {
      this.addedPending(message, messageId);
      let reply = await redix.import(message, {messageId}, this.config);
      await this.redis.lpush(this.config.queue.reply, this.stringifyReply(reply));
      this.removePending(message, messageId);
   } catch (err) {
      await this.redis.lpush(this.config.queue.error, message);
      this.revertPending(message, messageId, err);
      throw err;
   }
```
where we push the reply or the error into output queues.


Note that we add the pending request to a collection in Redis, and remove it once the message has been processed successfully.

To improve resilience and promote fail-safe canary releases, we should move failed messages into a recovery queue in the event of certain errors e.g. to be reprocessed by other instances.


## Learn more

HTTP request example:
- https://github.com/evanx/redixrouter/tree/master/test/case/httpRequest/

Static web server example:
- https://github.com/evanx/redixrouter/tree/master/test/case/webServer/

Redix processor implementations:
- https://github.com/evanx/redixrouter/tree/master/processors/
