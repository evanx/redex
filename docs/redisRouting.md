### Redix routing

Importers are configured with a `route` in YAML as follows:
```yaml
description: Import a message from a Redis queue
queue:
  in: redix:test:dispatcher:in # the redis key for the incoming queue
  reply: redix:test:dispatcher:reply # the redis key for reply reque
  pending: redix:test:dispatcher:pending # the queue for pending requests
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
      this.seq += 1;
      let messageId = this.seq;
      try {
         let message = await this.redis.brpoplpush(this.config.queue.in,
            this.config.queue.pending, this.popTimeout);
         this.addedPending(messageId, message);
         let reply = await redix.importMessage(message, {messageId}, this.config);
         if (reply) {
            this.redis.lpush(this.config.queue.reply, reply);
         }
         this.removePending(messageId, reply);
         setTimeout(() => this.pop(), 0);
      } catch (err) {
         this.revertPending(messageId, err);
         setTimeout(() => this.pop(), config.errorWaitMillis || 1000);
      }
```
where the `redix.importMessage` utility chains a timeout promise:
```javascript
export default class Redix {
   async importMessage(message, meta, options) {
      meta.expires = new Date().getTime() + options.timeout;
      let promise = this.dispatchMessage(message, meta, options.route);
      return new Promise((resolve, reject) => {
         promise.then(resolve, reject);
         setTimeout(() => {
            reject({
               name: 'Timeout',
               message: util.format('%s timeout (%dms)', meta.importer, time)
            });
         }, options.timeout);
      });
```

Alternatively processors return a promise to reply later:
```javascript
export default class RateLimitFilter {

   async processMessage(messageId, route, message) {
      this.count += 1;
      assert(this.count <= this.config.limit, 'Limit exceeded: ' + this.formatExceeded());
      return redix.dispatchMessage(message, meta, route);
   }
```
where we throw an exception to reject the message. This is equivalent to the promise being rejected.

Otherwise we invoke the `redix.processMessage` utility function to forward the message to the next processor in the `route,` returning a chained promise:

```javascript
export default class Redix {

   async dispatchMessage(messageId, route, message) {
      let nextProcessorName = route[0];
      let nextProcessor = this.processors.get(nextProcessorName);
      assert(nextProcessor, 'Invalid processor: ' + nextProcessorName);
      return nextProcessor.processMessage(message, meta, route.slice(1));
   }
```

In the event of a timeout or some other error, an exception is thrown. The exception is caught typically by the importer, e.g. as follows:
```javascript
   try {
      var redisReply = await this.redis.brpoplpush(this.config.queue.in,
         this.config.queue.pending, this.popTimeout);
      this.addedPending(messageId, redisReply);
      let reply = await redix.importMessage(message, {messageId}, this.config);
      await this.redis.lpush(this.config.queue.out, JSON.stringify(reply));
      this.removePending(messageId, redisReply);
   } catch (error) {
      this.redis.lpush(this.config.queue.error, JSON.stringify(error));
      this.revertPending(messageId, redisReply, error);
```
where we push the reply or the error into output queues.

Note that we add the pending request to a collection in Redis, and remove it once the message has been processed successfully. Depending on the type of exception, we might revert the pending message, to be fail-safe. For example if this instance is a canary release, we might remove it from our cluster based on such metrics, and still enable the message to be processed by another instance.

Learn more: https://github.com/evanx/redixrouter/blob/master/README.md
