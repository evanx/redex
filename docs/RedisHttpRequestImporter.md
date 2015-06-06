#### RedisHttpRequestImporter

This processor imports an HTTP request message from a Redis queue.

Config: `RedisHttpRequestImporter.singleton.yaml`
```yaml
description: Import an HTTP request message from a Redis queue
startup: 20 # startup priority number
queue:
  in: redix:test:http:in # the redis key for the incoming queue (list)
  out: redix:test:http:out # the redis queue for replies
  pending: redix:test:http:pending # the internal redis queue for pending requests
  error: redix:test:http:error # the external redis queue for failed requests
protocol: HttpRequest@1
route:
- HttpExporter.singleton
```

Implementation snippet: `processors/RedisHttpRequestImporter.js`
```JavaScript
async pop() {
   try {
      const redisReply = await this.redisBlocking.brpoplpush(this.config.queue.in,
         this.config.queue.pending, this.popTimeout);
      this.addedPending(redisReply);
      this.seq += 1;
      let data = JSON.parse(redisReply);
      let messageId = [this.processorId, this.seq].join(':');
      let redixInfo = { messageId };
      let message = { data, redixInfo };
      redix.dispatchMessage(this.config, message, this.config.route);
      this.removePending(redisReply);
      this.pop();
   } catch (error) {
      this.revertPending(redisReply);
      setTimeout(this.pop, config.errorWaitMillis || 1000);
   }
}
```
where we use a "promisified" Redis client ([Redis.js](https://github.com/evanx/redixrouter/blob/master/lib/Redis.js)) e.g. to use ES7 async/await.

See that we add the pending request to a collection in Redis, and remove it once the message has been dispatched. In event of an error, we revert the pending message, to be fail-safe.

Note that the Redis `brpoplpush` command blocks its Redis client instance, which can then not be used concurrently, so we create its own Redis client instance named `redisBlocking.`
