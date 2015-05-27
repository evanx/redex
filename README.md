
## Redix Router

Redix is a Node and Redis-based modular message router. It is assembled from configurable Redix "processors." We use it to build a Redis queue manager, for reactive microservices.

## Overview

Redix is a configurable logic layer for managing messaging between collaborating microservices.

Messages are imported from external sources (including Redis queues and other Redix instances) and conversely exported. Otherwise they are routed between Redix processors, which are actors of this Redix instance.

Metadata is attached to messages e.g. for routing and processing purposes. This metadata distinguishes a Redix-manageable queue from a "naked" Redis queue. For example, this metadata includes routing information for replies and error feedback e.g. in the event of a timeout.

The first simple use-case we wish to fulfil is a reliable queue for multiple consumers, implemented as follows:
- pop incoming messages from a Redis producer queue
- push each incoming message onto multiple queues, one for each consumer.

Application microservices can then consume their messages reliably. They might reply later, or feedback error information e.g. a timeout. If a consumer is busy, or crashed, its messages are delivered when it is available again, via its dedicated persistent Redis queue.

Also note that multiple workers can operate off a single consumer queue for scalability and resilience.

Redix processors are themselves a class of microservices. However, they are just the low-level plumbing for application microservices.


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

We will implement a number of built-in processors for our own requirements, and accept contributions.

We enable custom and third-party processors as "plugins" installed via `npm.` Otherwise Redix would not be particularly useful to others.

Metrics should be published by processors, for performance monitoring and management.


## Configuration

Currently each processor is configured via a YAML file in the Redix `config` directory. This should be managed using a private git repository, which then provides versioning.

The naming convention for each processor (and its configuration file) is a path e.g. `builtin/FileImporter.singleton.json`

This name is comprised of its Node module, JavaScript class, and finally its distinguishing instance name.

The distinguishing name enables multiple instances of the same processor class, configured for different purposes. Otherwise we name the instance as `singleton.`

The "module" name enables custom and third-party processors e.g. a `myredix/FancyProcessor` where `myredix` is an `npm` module which exports a `FancyProcessor` class.

Note that `npm` enables version dependency via `package.json.` Also, multiple versions of the same module can be installed as differently named modules, e.g. `myredix-1.0.0/FancyProcessor.`


## Messages

The following design is recommended for messages.

The interface for each message type can be defined, and should be versioned. We define the mandatory and optional properties, their types e.g. string, int, boolean, and their contracts. This is useful for automated error handling, and assertions during testing i.e. to fail-fast.

Otherwise transformative processors can be used to coerce messages into the expected format or required version.

Alternatively, multiple versions of processors can be installed e.g. to support older messages for some period.

However, we should facilitate a "canary release" of a Redix instance which handles an increasing number of incoming messages in parallel with the old release, in order to compare metrics and retire the old release.

## Concurrency

We use message queues to avoid concurrent operations.

Both Redis and Node have single-threaded event loops, which simplifies concurrency.

We use Redis for message queues, and also for "shared memory" accessed by Redix processors.

Our processors are message-passing "actors," and otherwise must use Redis transactions.


## Basic examples

### FileImporter

Import a message from a directory.

Config: `FileImporter.singleton.yaml`
```yaml
description: Read a message from a file
startup: 50 # startup priority number
watchedDir: fileImporter/watched/
replyDir: fileImporter/reply/
route:
- HttpClient.singleton
```

Incoming message: `fileImporter/watched/hn160705.yaml`
```yaml
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
messageInterface: # for automatic validation
- method # e.g. GET, POST
- url
```

Incoming message: `fileImporter/watched/hn160705.yaml`
```yaml
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
messageInterface: # for automatic validation
- method # e.g. GET, POST
- url
```
