
# Redix Router

Redix is a Node-based message router for a Redis-based message hub.

It can be used to compose runtime plumbing for collaborating microservices.


## Processors

A Redix "processor" is a configurable component that processes messages for routing purposes.

They are classified as follows:
- importer - import a message from an "external" source e.g. a Redis queue
- router - logically dispatch a message internally
- filter - logically eliminate messages
- exporter - export a message e.g. push to a Redis queue


## Example  

The first simple use-case we wish to fulfil is a reliable pubsub, implemented as follows:
- pop an incoming message from a Redis producer queue
- push each incoming message onto multiple parallel consumer queues.

If a consumer is busy, or crashed, its messages are still delivered when it is available again, via its queue, courtesy of Redis.

This process is implemented by composing basic processors as follows:
- an importer to pop incoming messages
- a fan-out processor
- multiple exporters to push to Redis queues

This approach enables configuration of this plumbing as an operational concern.


## Configuration

Currently each processor is configured via a YAML file in the Redix `config` directory. (This should be managed using a private git repository, for configuration versioning.)

The name of each processor (and its configuration file) is an "instance URI" e.g. `builtin/FileImporter.singleton.json`

This name is comprised of its Node module, JavaScript class, and finally its distinguishing instance name.

The distinguishing name enables multiple instances of the same processor class, configured for different purposes. Otherwise we name the instance as `singleton.`

The "module" name enables custom and third-party processors e.g. a `myredix/FancyProcessor` where `myredix` is an `npm` module which exports a `FancyProcessor` class.


## Concurrency

We use Redis-backed message queues to avoid concurrent operations.

Redix processors (and the application microservices they serve) are ideally message-passing "actors" and otherwise use Redis transactions to access "shared memory" in Redis.


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
