#### FileImporter

This processor imports a message from a directory.

Config: `FileImporter.singleton.yaml`
```yaml
description: Read a message from a file
watched: fileImporter/watched/
reply: fileImporter/reply/
timeout: 8000 # ms
route:
- RateLimitFilter.singleton
- HttpExporter.singleton
```

Incoming message: `fileImporter/watched/hn160705.yaml`
```yaml
url: https://hacker-news.firebaseio.com/v0/item/160705.json?print=pretty
method: GET
json: true
```

Reply: `fileImporter/reply/hn160705.json`
```json
{
  "by": "pg",
  "id": 160705,
  "parent": 160704,
  "score": 335,
  "text": "Yes, ban them; I'm tired of seeing Valleywag stories on News.YC.",
  "time": 1207886576,
  "type": "pollopt"
}
```

Implementation snippet: `processors/FileImporter.js`
```JavaScript
formatReplyFilePath(messageId) {
   return this.config.replyDir + messageId + '.json';
}

formatJsonContent(object) {
   return JSON.stringify(object, null, 2) + '\n';
}

async fileChanged(fileName) {
   let filePath = this.config.watchDir + fileName;
   let messageId = path.basename(fileName, '.yaml');
   try {
      let message = yaml.safeLoad(await Files.readFile(filePath));
      var replyFilePath = this.formatReplyFilePath(messageId);
      let exists = await Files.exists(replyFilePath);
      assert.equal(exists, false, 'Reply file already exists: ' + replyFilePath);
      let reply = await redex.import(message, {messageId}, this.config);
      Files.writeFile(replyFilePath, this.formatJsonContent(reply));
   } catch (err) {
      Files.writeFile(replyFilePath, this.formatJsonContent(error));
   }
}
```

where we use ES7 async/await (via Babel) to eliminate callbacks and use try/catch for error handling.

ES7 async functions work with ES6 promises, and so we introduce wrapper libraries to return promises:
- https://github.com/evanx/redex/blob/master/lib/Requests.js
- https://github.com/evanx/redex/blob/master/lib/Files.js


### HttpExporter

This processor exports a message via an HTTP GET request.

#### Config: `HttpExporter.singleton.yaml`
```yaml
description: Perform an HTTP request
queue:
  pending: redex:test:http:pending # Redis key for set for pending requests
```

Sample incoming message e.g. from `fileImporter/watched/hn160705.yaml:`
```yaml
url: https://hacker-news.firebaseio.com/v0/item/160705.json?print=pretty
method: GET
json: true
```

Implementation snippet: `processors/HttpExporter.js`
```JavaScript
async process(message, meta, route) {
   try {
      var messageString = JSON.stringify(message);
      assert.equal(await redis.sadd(this.config.queue.pending, messageString),
         1, 'sadd');
      return request({
         method: message.method || 'GET',
         url: message.url,
         json: message.json || true
      });
   } catch (err) {
      return err;
   } finally {
      assert.equal(await redis.srem(this.config.queue.pending, messageString),
         1, 'srem');
   }
}
```
Note that before sending the request, we put the message into a Redis set of pending requests. Such sets are unique, and so the message must be unique. When we get its response, we remove it from the set. This enables monitoring for timeouts, and recovering some state in the event of a restart.


### RateLimitFilter

This processor limits the rate of messages that are processed, e.g. 1 per second in this example configuration.

Config: `RateLimitFilter.singleton.yaml`
```yaml
description: Limit the rate of messages
periodMillis: 1000 # 1 second
limit: 1 # only route one message per second
```

Implementation snippet: `processors/RateLimitFilter.js`
```JavaScript
export default class RateLimitFilter {

   constructor(config) {
      this.config = config;
      assert(this.config.limit >= 0, 'limit');
      assert(this.config.periodMillis >= 0, 'periodMillis');
      this.count = 0;
      if (this.config.periodMillis > 0) {
         setTimeout(() => this.resetCount(), this.periodMillis);
      }
   }

   resetCount() {
      this.count = 0;
   }

   async process(message, meta, route) {
      this.count += 1;
      assert(this.count <= this.config.limit, 'Limit exceeded');
      return redex.dispatch(message, meta, route);
   }
}
```

### RedisHttpRequestImporter

This processor imports an HTTP request message from a Redis queue.

Config: `RedisHttpRequestImporter.singleton.yaml`
```yaml
description: Import an HTTP request message from a Redis queue
queue:
  in: redex:test:http:in # the redis key for the incoming queue (list)
  out: redex:test:http:out # the redis queue for replies
  pending: redex:test:http:pending # the internal redis queue for pending requests
  error: redex:test:http:error # the external redis queue for failed requests
timeout: 8000 # ms
route:
- HttpExporter.singleton
```

Implementation snippet: `processors/RedisHttpRequestImporter.js`
```JavaScript
async pop() {
   try {
      var redisReply = await this.redis.brpoplpush(this.config.queue.in,
         this.config.queue.pending, this.popTimeout);
      this.seq += 1;
      var messageId = this.seq;
      this.addedPending(messageId, redisReply);
      let message = JSON.parse(redisReply);
      let reply = await redex.import(message, {messageId}, this.config);
      await this.redis.lpush(this.config.queue.out, JSON.stringify(reply));
      this.removePending(messageId, redisReply);
      this.pop();
   } catch (error) {
      this.redis.lpush(this.config.queue.error, JSON.stringify(error));
      this.revertPending(messageId, redisReply, error);
      setTimeout(() => this.pop(), config.errorWaitMillis || 1000);
   }
}
```
where we use a "promisified" Redis client for ES7 async functions:
- https://github.com/evanx/redex/blob/master/lib/Redis.js

Depending on the type of exception, we revert the pending message, to be fail-safe. For example if this instance is a canary release, we might remove it from our cluster based on such metrics, and still enable the message to be processed by another instance.

Incidently that the Redis `brpoplpush` command blocks its Redis client instance, which can then not be used concurrently, so we create its own Redis client instance.


## Learn more

Redex routing:
- https://github.com/evanx/redex/blob/master/docs/redisRouting.md

HTTP request example:
- https://github.com/evanx/redex/tree/master/test/case/httpRequest/

Static web server example:
- https://github.com/evanx/redex/tree/master/test/case/webServer/
