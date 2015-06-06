
# Redix Router

Redix is:
- a Node-based message broker
- a orchestration tool for microservices
- a tool for building messaging middleware
- a generic framework for custom message processing

We tout Redix as:
- duct-tape for microservices
- an integration tool for reactive systems
- opensource software for reliable messaging through Redis

Its goals are:
- scalable and reliable messaging via multiple stateless instances on the same Redis
- a scalable distributed switch running on Redis Cluster
- an orchestrator for distributed systems

Its stretch goals are:
- a stream processing framework for streaming data

Use-cases:
- plumbing for collaborating microservices
- glue for network services
- legacy systems integration
- managing Redis queues

We are implementing:
- basic processors for HTTP and Redis queues
- sample configuration for reliable pubsub and work queues

We intend to implement processors to demonstrate:
- HTTPS termination
- HTTP proxy
- web server
- response caching
- load balancer
- auto scaler
- API gateway with authentication and authorisation
- centralised logging server using TCP/IP sockets
- outgoing email server using SMTP over TCP/IP sockets
- WebSocket server to push notications into the browser
- integration with ZeroMQ, RabbitMQ, Protobuf


# Rationale

Node is a popular platform for wiring network services.

Redis is a high-performance server for persistent data structures.

Combining Node and Redis is a compelling proposition for building reactive systems.


# Solution

We wish to decouple our systems and microservices and enable their collaboration through messaging e.g. via HTTP, Redis queues, etc.

In practice we need to reconfigure such wiring at runtime as an operational concern. For this purpose, use we introduce Redix.

The name "Redix" can be interpreted as "Redis-based message eXchange."


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

This process is implemented by composing basic processors as follows:
- an importer to pop incoming messages from the "producer queue"
- a fan-out processor to multiple exporters
- each exporter pushes to its "consumer queue"

Assuming the required processors are available in the Redix deployment, this approach then enables assembling such plumbing via runtime configuration. Hence we consider Redix as "duct-tape" for our application microservices.


## Configuration

Each processor is configured via a YAML file in the Redix `config` directory. (Such configuration should be managed using a private git repository, for versioning.)

The name of each processor (and its configuration file) is an "instance URI" e.g. `builtin/FileImporter.singleton.json.`

This name is comprised of its Node module, JavaScript class, and finally its distinguishing instance name.

The distinguishing name enables multiple instances of the same processor class, configured for different purposes. Otherwise we name the instance as `singleton.`

The "module" name enables custom and third-party processors e.g. a `myredix/FancyProcessor` where `myredix` is an `npm` module which exports a `FancyProcessor` class.

We wish to introduce a processor factory e.g. `builtin/FileImporter.factory.json,` to enable instances to be dynamically created by so messaging the factory.


## Concurrency

We use Redis message queues to avoid concurrent operations.

Application microservices, and Redix processors, are ideally message-passing "actors" and otherwise use Redis transactions to access "shared memory" in Redis.

We note that Node itself is designed to be asynchronous infrastructure for concurrent apps, driven by a single-threaded event loop.


## Examples

### HTTP request

Say we pull an HTTP GET request message with specified URL:
```yaml
url: https://hacker-news.firebaseio.com/v0/item/160705.json?print=pretty
method: GET
json: true
```
We import this request message using a file importer, or from a Redis queue.

See `scripts/test.sh`

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

#### FileImporter

This processor imports a message from a directory.

Config: `FileImporter.singleton.yaml`
```yaml
description: Read a message from a file
startup: 50 # startup priority number
watched: fileImporter/watched/
reply: fileImporter/reply/
protocol: HttpRequestExchange@1
route:
- HttpRequestValidator.singleton
- HttpExporter.singleton
```

Incoming message: `fileImporter/watched/hn160705.yaml`
```yaml
redix:
  type: HttpRequest@1
data:
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
fs.readFile(this.config.watchDir + fileName, (err, content) => {
   if (!err) {
      let data = yaml.safeLoad(content);
      let messageId = path.basename(fileName, '.yaml');
      let redixInfo = { messageId };
      let message = { data, redixInfo };
      redix.dispatchMessage(this.config, message, this.config.route);
```

#### HttpExporter

This processor exports a message via an HTTP GET request.

Config: `HttpExporter.singleton.yaml`
```yaml
description: Perform an HTTP request
startup: 10 # startup priority number
queue:
  pending: redix:test:http:pending # Redis key for set for pending requests
```

Sample incoming message e.g. from `fileImporter/watched/hn160705.yaml:`
```yaml
redix:
  messageId: hn160705
data:
  url: https://hacker-news.firebaseio.com/v0/item/160705.json?print=pretty
  method: GET
  json: true
```

Implementation snippet: `processors/HttpExporter.js`
```JavaScript
async processMessage(message) {
   try {
      const messageString = JSON.stringify(message);
      assert.equals(await redis.sadd(this.config.queue.pending, messageString),
         1, 'sadd');
      redix.dispatchReverseReply(this.config, message,
         await request({
            method: message.data.method || 'GET',
            url: message.data.url,
            json: message.data.json || true
         }));
   } catch (err) {
      redix.dispatchReverseErrorReply(message, err);
   } finally {
      assert.equals(await redis.srem(this.config.queue.pending, messageString),
         1, 'srem');
   }
}
```
where we use ES7 async/await, to eliminate callbacks and use try/catch for error handling. (We enable this via Babel.) The use ES6 promise wrappers for the Redis client ([Redis.js](https://github.com/evanx/redixrouter/blob/master/lib/Redis.js)) and HTTP `request` ([Requests.js](https://github.com/evanx/redixrouter/blob/master/lib/Requests.js)) libraries, so that we can `await` them.

See that before sending the request, we put the message into a Redis set of pending requests. Such sets are unique, and so the message must be unique. When we get its response, we remove it from the set. This enables monitoring for timeouts, and recovering some state in the event of a restart.


#### RateLimitFilter

This processor limits the rate of messages that are processed, e.g. 1 per second in this example configuration.

Config: `RateLimitFilter.singleton.yaml`
```yaml
description: Limit the rate of messages
startup: 10 # startup priority number
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
         setTimeout(this.resetCount, this.periodMillis);
      }
   }

   resetCount() {
      this.count = 0;
   }

   processMessage(message) {
      if (this.count < this.limit) {
         this.count += 1;
         redix.dispatchMessage(this.config, message);
      } else {
         redix.dispatchReverseErrorReply(this.config, message,
            { errorMessage: 'limit exceeded' });
      }
   }
```

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
