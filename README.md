
# Redix Router

We tout Redix as "duct-tape for microservices."

It is a Node-based message router.

It can be used to compose runtime plumbing for reactive microservices.

We implement basic processors for HTTP and Redis-backed queues.

We wish to implement processors for WebSockets too, in order to push messages into the browser.

It is not prescriptive and might be used for other messaging mechanisms e.g. ZeroMQ, RabbitMQ and TCP/IP sockets e.g. for legacy systems.


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
- Proxy
- Load balancer
- API gateway


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

### FileImporter

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
      let message = yaml.safeLoad(content);
      message.redix = {
         messageId: path.basename(fileName, '.yaml'),
         routed: []
      };
      redix.dispatchMessage(this.config, message, this.config.route);
   }
});
```

### HttpGet exporter

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
      if (!err && response.statusCode == 200) {
         this.dispatchReply(message, reply);
      }
   });
}
```

### LimitFilter

Limit the number of messages ever processed.

Config: `RedisHttpRequestImporter.singleton.yaml`
```yaml
description: Limit number of messages
startup: 10 # startup priority number
limit: 1 # only route the first message
```

Implementation snippet: `processors/LimitFilter.js`
```JavaScript
processMessage(message) {
   if (this.count < this.limit) {
      this.count += 1;
      redix.dispatchMessage(this.config, message, message.redix.route);
   } else {
      logger.info('drop:', message.redix.messageId);
   }
}
```

### RedisHttpRequestImporter

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
   redis.brpop(this.config.queue, this.config.popTimeout || 0).then(string => {
      let message = JSON.parse(string);
      redix.dispatchMessage(this.config, message, this.config.route);
      this.dispatch();
   }).catch(error => {
      logger.error('error:', error);
   });
}
```
where we use a "promisified" Redis client e.g. to use ES7 async/await.
