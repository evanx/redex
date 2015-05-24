
## Redswitch 

Redis-based switch to route messages for reactive microservices.

## Overivew 

Redswitch keys on the local Redis instance are called "internal." Other keys or systems are "external."

Metadata is attached to messages e.g. for routing and processing purposes.

### Importers

An importer task will accept a message from a external source and push it into a Redis queue.

### Exporters

An exporter task will pop a message from a Redis queue and export to an external source.

### Routers 

A router task will pop a message from a Redis queue, and dispatch this message internally.

### Compacter

A task to eliminate messages from a queue.

## Examples: importers

### Redis importer

Import a message from a Redis queue.

### HTTP importer

Import a message from an HTTP request. 

## Examples: exporters

### Redis importer

Import a message from a Redis queue, and route to an internal Redis queue.

### Redis exporter

Export a message to a Redis queue.

### File exporter

Export a message to a file in a specified format.

#### SQL exporter

Export a message to an SQL database.

## Examples: routers

### Multiplexer

A router which dispatches each message to multiple queues e.g. as a reliable pubsub queue for multiple consumers.


