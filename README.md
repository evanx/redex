
# Redix Router - "duct-tape for microservices"

Redix is a Node-based message router.

It can be used to compose runtime plumbing for decoupled microservices.

We implement basic processors for HTTP, Redis-backed queues and WebSockets.

It is non-perscriptive and might be used for other messaging mechanisms e.g. TCP/IP sockets, REST, ZeroMQ and RabbitMQ.


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


## User-case example  

The first simple use-case we wish to fulfil is a reliable pubsub, implemented as follows:
- pop an incoming message from a Redis "producer queue"
- push each incoming message onto multiple parallel "consumer queues"

If a consumer is busy, or crashed, its messages are still delivered when it is available again, via its Redis queue.

This process is implemented by composing basic processors as follows:
- an importer to pop incoming messages from the "producer queue"
- a fan-out processor to multiple exporters
- each exporter pushes to its "consumer queue"

Assuming the required processors are available in the Redix deployment, this approach then enables assembling such plumbing via runtime configuration, to "duct-tape" our application microservices together.


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
- HttpClient.singleton
```

Incoming message: `fileImporter/watched/hn160705.yaml`
```yaml
redix:
  type: HttpRequest@1
data:
  method: GET
  url: https://hacker-news.firebaseio.com/v0/item/160705.json?print=pretty
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

### HttpClient exporter

Export a message via an HTTP request.

Config: `HttpClient.singleton.yaml`
```yaml
description: Perform an HTTP request
startup: 10 # startup priority number
```

Incoming message e.g. from `fileImporter/watched/hn160705.yaml:`
```yaml
redix:
  type: HttpRequest@1
data:
  method: GET
  url: https://hacker-news.firebaseio.com/v0/item/160705.json?print=pretty
```

### RedisHttpRequestImporter

Import an HTTP request message from a Redis queue.

Config: `RedisHttpRequestImporter.singleton.yaml`
```yaml
description: Import an HTTP request message from a Redis queue
startup: 20 # startup priority number
queue: test:http # the redis key for the queue (list)
protocol: HttpRequest@1
```
