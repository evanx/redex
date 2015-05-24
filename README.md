
## Redswitch 

Redis-based switch for routing messages

### Importers

An importer task will accept a message from a external source and push it into a Redis queue


### Exporters

An exporter task will pop a message from a Redis queue and export to an external source


### Routers 

A router task will pop a message from a Redis queue, and dispatch this message internally 


### Examples: importers

#### Redis importer

Import a message from a Redis queue.

#### HTTP importer

Import a message from an HTTP request. 

### Examples: exporters

#### Redis exporter

Export a message to a Redis queue.

### Examples: routers

#### Multiplexer

A router which dispatches each message to multiple queues.


