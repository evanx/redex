
## Redix Router

Redis-based switch to route messages between Redis queues e.g. for reactive microservices.

## Overivew

Redix keys on its Redis instance are called "internal." Other keys or systems are "external."

Metadata is attached to messages e.g. for routing and processing purposes.

The rationale and use-case we need is as follows:
- pop incoming messages from a Redis producer queue
- push each incoming message onto multiple consumer queues
- consumer microservices then pop messages off their consumer queues

The above leads to a reliable message queue for multiple consumers, where if the consumer is busy, or crashed, its messages are delivered when it is available e.g. restarts.

Also note that multiple workers can operate of a consumer queue for scalability.

We call a component that processes messages, a "processor."

Processors might be classified as follows:
- importer - accepts a message from a external source and pushes it into a Redis queue.
- exporter - exports a message to an external source.
- router - dispatches a message (internally).
- enqueuer - dispatch a message into a Redis queue.
- dequeuer - pops a message from a Redis queue, and dispatches this message internally.
- compacter - eliminate messages from a queue.

## Configuration

Each processor is configured via a YAML file in the Redix `configDir`

The naming convention of the processor is its class, dot, its distinguishing name e.g. `FileImporter.default`

## Examples

### FileImporter

Import a message from a directory.

```json
watchDir: tmp/fileImporter/import/
replyDir: tmp/fileImporter/export/
route:
- HttpClient.default
```

### HttpClient exporter

Export a message via an HTTP request.

```json
message:
- method // e.g. GET, POST
- url
```

### RedisImporter

Import a message from a Redis queue.
