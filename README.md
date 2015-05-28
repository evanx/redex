
## Redix Router

Redix is a Node-based message router for a Redis-based message hub.

It can used to compose plumbing for collaborating microservices.

## Overview

Messages are imported from external sources (including Redis queues and other Redix instances) and conversely exported. Otherwise they are routed between Redix processors. These are "actors" configured for a Redix instance.

Metadata is attached to messages e.g. for routing and processing purposes. It includes routing information for replies and error feedback e.g. in the event of a timeout. Additionally, it might include state for further processing purposes.

The first simple use-case we wish to fulfil is a reliable queue for multiple consumers, implemented as follows:
- pop an incoming message from an external Redis producer queue
- push each incoming message onto multiple external queues, one for each logical consumer.

Application microservices can then consume their messages reliably. They might reply later, or feedback error information e.g. a timeout. If a consumer is busy, or crashed, its messages are delivered when it is available again, via its dedicated persistent Redis queue.

Also note that multiple "workers" can operate off a single "consumer" queue, for scalability and resilience.


## Processors

A "processor" is a component that processes messages.

Processors might be classified as follows:
- importer - import a message from a external source.
- exporter - export a message to an external source.
- router - dispatch a message (internally).
- enqueuer - dispatch a message into a Redis queue.
- dequeuer - pop a message from a Redis queue, and dispatch this message.
- compacter - eliminate messages from a queue.

Messaging passing between processors is preferrably via Redix message queues, to improve resilence and management.

We will implement a number of built-in processors as for own requirements or as an exercise, and accept contributions.

We enable custom and third-party processors as "plugins" installed via `npm.` Otherwise Redix would not be particularly useful to others.

Performance metrics should be published by processors. Those metrics might be used for a load balancer, for example.


## Configuration

Currently each processor is configured via a YAML file in the Redix `config` directory. This should be managed using a private git repository, which then provides versioning.

The name of each processor (and its configuration file) is an "instance URI" e.g. `builtin/FileImporter.singleton.json`

This name is comprised of its Node module, JavaScript class, and finally its distinguishing instance name.

The distinguishing name enables multiple instances of the same processor class, configured for different purposes. Otherwise we name the instance as `singleton.`

The "module" name enables custom and third-party processors e.g. a `myredix/FancyProcessor` where `myredix` is an `npm` module which exports a `FancyProcessor` class.

Note that `npm` enables version dependency via `package.json.` Also, multiple versions of the same module can be installed as differently named modules, e.g. `myredix-1.0.0/FancyProcessor.`


## Messages

The following is recommended for messages.

The validator for each message type can be defined, and should be versioned. This checks mandatory and optional properties, their types e.g. string, int, boolean, and their contracts, to fail-fast.

Transformative processors can be implemented to coerce messages into the expected format, and migrate messages to a required version.

Alternatively, multiple versions of a processor can be installed e.g. to support older messages for some period.

We should facilitate a "canary release" for a Redix instance. This handles a variable portion of incoming messages in parallel with the incumbent release. We compare metrics in order to retire the incumbent, if so indicated.


## Concurrency

We use Redis-backed message queues to avoid concurrent operations.

Redix processors and application microservices are ideally message-passing "actors" and otherwise use Redis transactions to access "shared memory" in Redis.


## Basic examples

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
protocol: HttpRequestExchange@1
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
protocol: HttpRequestExchange@1
```
