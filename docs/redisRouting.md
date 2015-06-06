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
let reply = await redix.processMessage(messageId, this.config.route, message);
```

Alternatively they return a promise to reply later:
```javascript
export default class RateLimitFilter {

   async processMessage(messageId, route, message) {
      this.count += 1;
      if (this.count > this.config.limit) {
         throw new Error('Limit exceeded');
      } else {
         return redix.processMessage(messageId, route, message);
      }
   }
```
where we throw an exception to reject the message. This is equivalent to the promise being rejected.

Otherwise we invoke the `redix.processMessage` utility function to forward the message to the next processor in the `route,` returning a chained promise:

```javascript
export default class Redix {

   async processMessage(messageId, route, message) {
      let nextProcessor = this.processors.get(route[0]);
      return nextProcessor.processMessage(messageId, route.slice(1), message);
   }
```

In the event of a timeout or some other error, an exception is thrown. The exception is caught typically by the importer, e.g. as follows:
```javascript
   try {
      var redisReply = await this.redis.brpoplpush(this.config.queue.in,
         this.config.queue.pending, this.popTimeout);
      this.addedPending(messageId, redisReply);
      let reply = await redix.processMessage(messageId, this.config.route, message);
      await this.redis.lpush(this.config.queue.out, JSON.stringify(reply));
      this.removePending(messageId, redisReply);
   } catch (error) {
      this.redis.lpush(this.config.queue.error, JSON.stringify(error));
      this.revertPending(messageId, redisReply, error);
```
where we push the reply or the error into output queues.

Note that we add the pending request to a collection in Redis, and remove it once the message has been processed successfully. Depending on the type of exception, we might revert the pending message, to be fail-safe. For example if this instance is a canary release, we might remove it from our cluster based on such metrics, and still enable the message to be processed by another instance.

https://github.com/evanx/redixrouter/blob/master/README.md
