
# Redix Router

The name "Redix" can be interpreted as "Redis-based message eXchange."

Redix is a Node framework and tool for:
- reliable messaging through Redis queues
- custom messaging middleware

Goals:
- distributable via replicas running against the same Redis server
- scalable and reliable, especially when using Redis Cluster
- commit to ES7 async functions i.e. await and try/catch
- release version 1.0 in 2016 when ES7 is standardised


## Solution

We wish to decouple our systems and microservices and enable their collaboration through messaging e.g. via HTTP, Redis queues, etc.

In practice we need to reconfigure such wiring at runtime as an operational concern. For this purpose, use we introduce Redix.


## Rationale

We wish to leverage ES7, Node and Redis because:
- Redis is a high-performance server for persistent data structures
- Node is a popular platform for network programming
- ES7 eases the synchronisation of asynchronous co-routines


## Road map

We intend to implement processors to demonstrate various use-cases.

July 2015 - PoC:
- basic processors for HTTP and Redis queues
- sample configuration for reliable pubsub and work queues
- HTTP proxy

September 2015 - web:
- web server
- response caching
- simple HTTP load balancer

January 2016 - auth:
- HTTPS termination
- API gateway with authentication and authorisation
- WebSocket server to push notications into the browser

June 2016 - integration:
- integration with ZeroMQ, RabbitMQ, Protobuf

Unscheduled:
- scheduler
- auto scaler
- analytics server for web apps
- centralised logging server using TCP/IP sockets
- outgoing email server using SMTP over TCP/IP sockets


### Concurrency

We use Redis message queues to avoid concurrent operations.

Application microservices, and Redix processors, are ideally message-passing "actors" and otherwise use Redis transactions to access "shared memory" in Redis.

We note that Node itself is designed to be "asynchronous infrastructure for concurrent apps," driven by a single-threaded event loop.


## Processors

A Redix instance is composed with collaborating "processors."

A Redix "processor" is a configurable component that processes messages for routing purposes.

Example classifications:
- importer: import a message from an "external" source e.g. a Redis queue
- router: dispatch a message to other internal processors
- translator: translate messages between different protocols
- filter: eliminate messages
- aggregator: aggregate multiple messages into a new aggregated message
- exporter: export a message e.g. push to a Redis queue


## Use-case example  

A simple use-case we wish to fulfil is a reliable pubsub, implemented as follows:
- pop an incoming message from a Redis "producer queue"
- push each incoming message onto multiple parallel "consumer queues"

If a consumer is busy, or crashed, its messages are still delivered when it is available again, via its Redis queue.

We compose basic processors to implement this process as follows:
- an importer to pop incoming messages from the "producer queue"
- a fan-out processor to multiple exporters
- each exporter pushes to its "consumer queue"

Assuming the required processors are available in the Redix deployment, this approach then enables assembling such plumbing via runtime configuration. Hence we consider Redix as "duct-tape" for our application microservices.


## Configuration

Each processor is configured via a YAML file in the Redix `config` directory. (Such configuration should be managed using a private git repository, for versioning, with Redix as a dependency.)

The name of each processor (and its configuration file) is an "instance URI" e.g. `builtin/FileImporter.singleton.json.`

This name is comprised of its Node module, JavaScript class, and finally its distinguishing instance name.

The distinguishing name enables multiple instances of the same processor class, configured for different purposes. Otherwise we name the instance as `singleton.`

The "module" name enables custom and third-party processors e.g. a `myredix/FancyProcessor` where `myredix` is an `npm` module which exports a `FancyProcessor` class.

We wish to introduce a processor factory e.g. `builtin/FileImporter.factory.json,` to enable instances to be dynamically created by so messaging the factory.


## Examples

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
         let reply = await redix.importMessage(message, {messageId}, this.config);
         await this.redis.lpush(this.config.queue.reply, reply);
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

   async importMessage(message, meta, options) {
      let importer = options.processorName;
      meta.expires = new Date().getTime() + options.timeout;
      let promise = this.dispatchMessage(message, meta, options.route);
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

   async processMessage(message, meta, route) {
      this.count += 1;
      if (this.count > this.config.limit) {
         throw new Error('Limit exceeded');
      } else {
         return redix.dispatchMessage(message, meta, route);
      }
   }
```
where we throw an exception to reject the message. (This is equivalent to the promise being rejected.)

Otherwise we invoke the `redix.dispatchMessage` utility function to invoke the next processor in the route and return its promise.

```javascript
export default class Redix {

   async dispatchMessage(message, meta, route) {
      let nextProcessorName = route[0];
      let nextProcessor = this.processors.get(nextProcessorName);
      assert(nextProcessor, 'Invalid processor: ' + nextProcessorName);
      return nextProcessor.processMessage(message, meta, route.slice(1));
   }
```

The importer therefore gets a chain of promises, from its own timeout promise, through to an exporters promise.


#### Reply and error handling

In the event of a timeout or some other error, this exception is caught by the importer as follows:
```javascript
   const message = await this.redis.brpoplpush(this.config.queue.in,
      this.config.queue.pending, this.popTimeout);
   const messageId = this.getNextMessageId();
   try {
      this.addedPending(message, messageId);
      let reply = await redix.importMessage(message, {messageId}, this.config);
      await this.redis.lpush(this.config.queue.out, this.stringifyReply(reply));
      this.removePending(message, messageId, reply);
   } catch (err) {
      await this.redis.lpush(this.config.queue.error, message);
      this.revertPending(message, messageId, err);
      throw err;
   }
```
where we push a JSON reply, or an error, into output queues.

Note that we add the pending request to a collection in Redis, and remove it once the message has been processed successfully.

To improve resilience and promote fail-safe canary releases, we should move failed messages into a recovery queue in the event of certain errors e.g. to be reprocessed by other instances.


### Example: HTTP request

Say we pull an HTTP GET request message with specified URL:
```yaml
url: https://hacker-news.firebaseio.com/v0/item/160705.json?print=pretty
method: GET
json: true
```
We import this request message using a file importer, or from a Redis queue.

In the case of a file importer, we create the request as follows:
```shell
echo '
  url: https://hacker-news.firebaseio.com/v0/item/160705.json?print=pretty
  method: GET
  json: true
' > tmp/fileImporter/watched/hn160705.yaml
```

Alternatively, we push this message onto the Redis queue using `redis-cli` as follows:
```shell
redis-cli lpush redix:test:http:in '{
  "url": "https://hacker-news.firebaseio.com/v0/item/160705.json?print=pretty",
  "method": "GET",
  "json": true
}'
```

We expect the following reply to be routed back to the importer:
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

We check the reply to the file importer:
```shell
evans@boromir:~/redixrouter$ grep Valleywag tmp/fileImporter/reply/hn160705.json

  "text": "Yes, ban them; I'm tired of seeing Valleywag stories on News.YC.",
```

Finally, we check the reply to the Redis importer:
```shell
evans@boromir:~/redixrouter$ redis-cli lrange redix:test:http:out 0 -1 |
  python -mjson.tool | grep '"text":'

  "text": "Yes, ban them; I'm tired of seeing Valleywag stories on News.YC.",
```

See this test: https://github.com/evanx/redixrouter/tree/master/test/httpRequest/


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
      let reply = await redix.importMessage(message, {messageId}, this.config);
      Files.writeFile(replyFilePath, this.formatJsonContent(reply));
   } catch (err) {
      Files.writeFile(replyFilePath, this.formatJsonContent(error));
   }
}
```

where we use ES7 async/await (via Babel) to eliminate callbacks and use try/catch for error handling.

ES7 async functions work with ES6 promises, and so we introduce wrapper libraries to return promises:
- https://github.com/evanx/redixrouter/blob/master/lib/Requests.js
- https://github.com/evanx/redixrouter/blob/master/lib/Files.js


### HttpExporter

This processor exports a message via an HTTP GET request.

#### Config: `HttpExporter.singleton.yaml`
```yaml
description: Perform an HTTP request
queue:
  pending: redix:test:http:pending # Redis key for set for pending requests
```

Sample incoming message e.g. from `fileImporter/watched/hn160705.yaml:`
```yaml
url: https://hacker-news.firebaseio.com/v0/item/160705.json?print=pretty
method: GET
json: true
```

Implementation snippet: `processors/HttpExporter.js`
```JavaScript
async processMessage(message, meta, route) {
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

   async processMessage(message, meta, route) {
      this.count += 1;
      assert(this.count <= this.config.limit, 'Limit exceeded');
      return redix.dispatchMessage(message, meta, route);
   }
}
```

### RedisHttpRequestImporter

This processor imports an HTTP request message from a Redis queue.

Config: `RedisHttpRequestImporter.singleton.yaml`
```yaml
description: Import an HTTP request message from a Redis queue
queue:
  in: redix:test:http:in # the redis key for the incoming queue (list)
  out: redix:test:http:out # the redis queue for replies
  pending: redix:test:http:pending # the internal redis queue for pending requests
  error: redix:test:http:error # the external redis queue for failed requests
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
      let reply = await redix.importMessage(message, {messageId}, this.config);
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
- https://github.com/evanx/redixrouter/blob/master/lib/Redis.js

Depending on the type of exception, we revert the pending message, to be fail-safe. For example if this instance is a canary release, we might remove it from our cluster based on such metrics, and still enable the message to be processed by another instance.

Incidently that the Redis `brpoplpush` command blocks its Redis client instance, which can then not be used concurrently, so we create its own Redis client instance.

See processors:
- https://github.com/evanx/redixrouter/tree/master/processors
