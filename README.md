
## Redix Router

Redis-based switch to route messages between Redis queues e.g. for reactive microservices.

## Overview

Messages might be imported and exported, and otherwise routed between processors, using Redis queues for our concurrency model.

Metadata is attached to messages e.g. for routing and processing purposes.

The rationale and use-case we need is as follows:
- pop incoming messages from a Redis producer queue
- push each incoming message onto multiple consumer queues
- consumer microservices then pop messages off their consumer queues

The above enables reliable messaging for multiple reactive consumers, where if the consumer is busy, or crashed, its messages are delivered when it restarts, via a blocking pop operation on the Redis queue.

Also note that multiple workers can operate off a consumer queue for scalability and resilience.

## Processors

A "processor" is a component that processes messages.

Redix keys (e.g. queues) on its Redis instance are called "internal." Other keys or systems are "external."

Processors might be classified as follows:
- importer - import a message from a external source.
- exporter - export a message to an external source.
- router - dispatch a message (internally).
- enqueuer - dispatch a message into a Redis queue.
- dequeuer - pop a message from a Redis queue, and dispatch this message.
- compacter - eliminate messages from a queue.

We implement a number of generally useful built-in processors, but the idea is that custom ones can be implemented and used in your deployment.


## Configuration

Each processor is configured via a YAML file in the Redix `configDir`

The naming convention of the processor e.g. `FileImporter.default` is: its class, dot, its distinguishing name.

This allows multiple instances of the same processor class, configured for different purposes.

## Examples

### FileImporter

Import a message from a directory.

Config: `FileImporter.default.yaml`
```yaml
watchDir: tmp/fileImporter/import/
replyDir: tmp/fileImporter/export/
route:
- HttpClient.default
```

Incoming message: `fileImporter/import/1.yaml`
```yaml
method: GET
url: http://data.iol.io/s/frontage
```

Reply: `fileImporter/export/1.json`
```json
{
  "id": 1862764,
  "link": "http://www.iol.co.za/sport/soccer/platini-won-t-vote-for-blatter-1.1862764",
  "published": "2015-05-25T09:03:19.000Z",
  "title": "Platini won’t vote for Blatter",
}
```

### HttpClient exporter

Export a message via an HTTP request.

Config: `HttpClient.default.yaml`
```yaml
message:
- method // e.g. GET, POST
- url
```

Incoming message: `tmp/fileImporter/import/1.yaml`
```yaml
method: GET
url: http://data.iol.io/s/frontage
```

### RedisImporter

Import a message from a Redis queue.
