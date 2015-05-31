
# Redix Router

Redix is a Node-based message router.

We tout Redix as "duct-tape for reactive microservices."

More generally speaking, it is "glue for network services."

Its characteristics are:
- a generic framework for custom message processors
- composable via runtime configuration

Use-cases:
- compose runtime plumbing for collaborating services
- wire together network services
- integration with legacy systems
- a manager for Redis queues

We implement basic processors for HTTP, Redis queues and file-based messages, as an exercise, and for our own limited requirements.

However it is not prescriptive and might be used for other messaging mechanisms e.g. ZeroMQ, RabbitMQ, Protocol Buffers and TCP/IP sockets e.g. for legacy systems.

We intend to implement processors for WebSockets too, in order to push messages into the browser, for our own requirements.

Additionally as an exercise, we intend to demonstrate its application for ZeroMQ, RabbitMQ, Protocol Buffers and TCP/IP sockets in the coming months.


# Rationale

Node is a superb platform for wiring network services, and indeed for the implementation of reactive microservices.

Redis is a high-performance server for persistent data structures, "shared memory" and reliable queues.

Combining Node and Redis for reactive microservices, is an exciting proposition for building high-performance, reactive systems.

We wish to decouple our microservices and enable their collaboration through messaging e.g. via HTTP, Redis queues, etc.

In practice we need to reconfigure such wiring at runtime as an operational concern. For this purpose, use we introduce Redix.

The name "Redix" can be interpreted as "Redis-based message eXchange." Actually this is a misnomer, because it  it is a minimal non-prescriptive message-processing framework. It so happens that we intend to apply it to our own microservices which favour Redis.


## Processors

A Redix instance is composed with collaborating "processors."

A Redix "processor" is a configurable component that processes messages for routing purposes.

They are classified as follows:
- importer: import a message from an "external" source e.g. a Redis queue
- router: logically dispatch a message internally
- fan out: duplicate messages
- filter: eliminate messages
- exporter: export a message e.g. push to a Redis queue


## Use-cases

Redix can be used to compose the following infrastructure:
- Reliable pubsub, pipeline and synchronous messaging using HTTP, Redis et al
- API gateway
- Load balancer
- Caching proxy


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

We note that Node itself is designed to be asychronous infrastructure for concurrent apps, driven by a single-threaded event loop.


## Examples

### HTTP GET

Say we pull an HTTP GET request message with specified URL:
```yaml
url: https://hacker-news.firebaseio.com/v0/item/160705.json?print=pretty
```

We import this request message using a file importer, or from a Redis queue.

See `scripts/test.sh`

In the case of a file importer, we create the request as follows:
```shell
echo '
  method: GET
  url: https://hacker-news.firebaseio.com/v0/item/160705.json?print=pretty
' > tmp/fileImporter/watched/hn160705.yaml
```

Alternatively, we push this message onto the Redis queue using `redis-cli` as follows:
```shell
redis-cli lpush redix:test:http:in '{
  "url": "https://hacker-news.firebaseio.com/v0/item/160705.json?print=pretty"
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
    "text": "Yes, ban them; I'm tired of seeing Valleywag stories on News.YC.",```
```

#### FileImporter

Import a message from a directory.

Config: `FileImporter.singleton.yaml`
```yaml
description: Read a message from a file
startup: 50 # startup priority number
watched: fileImporter/watched/
reply: fileImporter/reply/
protocol: HttpRequestExchange@1
route:
- HttpRequestValidator.singleton
- HttpGet.singleton
```

Incoming message: `fileImporter/watched/hn160705.yaml`
```yaml
redix:
  type: HttpRequest@1
data:
  url: https://hacker-news.firebaseio.com/v0/item/160705.json?print=pretty
  method: GET
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
   }
});
```

#### HttpGet exporter

Export a message via an HTTP GET request.

Config: `HttpGet.singleton.yaml`
```yaml
description: Perform an HTTP request
startup: 10 # startup priority number
```

Sample incoming message e.g. from `fileImporter/watched/hn160705.yaml:`
```yaml
redix:
  messageId: hn160705
data:
  url: https://hacker-news.firebaseio.com/v0/item/160705.json?print=pretty
  method: GET
```

Implementation snippet: `processors/HttpGet.js`
```JavaScript
processMessage(message) {
   logger.info('process', message);
   request({
      url: message.data.url,
      json: true
   }, (err, response, reply) => {
      if (err) {
         redix.dispatchErrorReply(this.config, message, err);
      } else if (response.statusCode != 200) {
         redix.dispatchErrorReply(this.config, message,
            {statusCode: response.statusCode});
      } else {
         redix.dispatchReply(message, reply);
      }
   });
}
```

#### RateLimitFilter

Limit the rate of messages that are processed.

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
      assert.ok(this.config.limit >= 0);
      this.count = 0;
      if (this.config.periodMillis) {
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
         redix.dispatchErrorReply(this.config, message,
            { message: 'limit exceeded' });
      }
   }
```

#### RedisHttpRequestImporter

Import an HTTP request message from a Redis queue.

Config: `RedisHttpRequestImporter.singleton.yaml`
```yaml
description: Import an HTTP request message from a Redis queue
startup: 20 # startup priority number
queue:
  in: redix:test:http:in # the redis key for the incoming queue (list)
  out: redix:test:http:out # the redis queue for replies
protocol: HttpRequest@1
route:
- HttpGet.singleton
```

Implementation snippet: `processors/RedisHttpRequestImporter.js`
```JavaScript
dispatch() {
   redis.brpop(this.config.queue.in, this.config.popTimeout || 0).then(string => {
      let message = JSON.parse(string);
      redix.dispatchMessage(this.config, message, this.config.route);
      this.dispatch();
   }).catch(error => {
      redix.dispatchErrorReply(this.config, message, error);
   });
}
```
where we use a "promisified" Redis client e.g. to use ES7 async/await.

See `redisPromised.js:` https://github.com/evanx/redixrouter/blob/master/lib/redisPromised.js
<br>and its test: https://github.com/evanx/redixrouter/blob/master/test/redisPromised.js
