
# Redix Router

The name "Redix" can be interpreted as "Redis-based message eXchange."

Redix is a tool for:
- systems integration
- orchestration of microservices

Redix is a Node framework for:
- reliable messaging through Redis queues
- custom messaging middleware

Goals:
- distributable via replicas running against the same Redis server
- scalable and reliable, especially when using Redis Cluster
- commit to ES7 async functions i.e. await and try/catch
- release version 1.0 in 2016 when ES7 is standardised


## Solution

We wish to decouple our systems and microservices and enable their collaboration through messaging e.g. via HTTP, Redis queues, etc.

In practice we need to reconfigure such wiring at runtime as an operational concern. For this purpose, use we introduce Redix.


## Rationale

We wish to leverage ES7, Node and Redis because:
- Redis is a high-performance server for persistent data structures
- Node is a popular platform for network programming
- ES7 eases the synchronisation of asynchronous co-routines


## Road map

We intend to implement processors to demonstrate various use-cases, likely in a different order than planned:

July 2015 - PoC:
- basic processors for HTTP and Redis queues
- static web server
- HTTP proxy

September 2015 - web:
- sample configuration for reliable pubsub and work queues
- response caching
- simple HTTP load balancer

January 2016 - auth:
- HTTPS termination
- API gateway with authentication and authorisation
- WebSocket server to push notications into the browser

June 2016 - integration:
- integration with ZeroMQ, RabbitMQ, Protobuf

Unscheduled:
- scheduler
- auto scaler
- analytics server for web apps
- centralised logging server using TCP/IP sockets
- outgoing email server using SMTP over TCP/IP sockets


### Concurrency

We use Redis message queues to avoid concurrent operations.

Application microservices, and Redix processors, are ideally message-passing "actors" and otherwise use Redis transactions to access "shared memory" in Redis.

We note that Node itself is designed to be "asynchronous infrastructure for concurrent apps," driven by a single-threaded event loop.


## Processors

A Redix instance is composed with collaborating "processors."

A Redix "processor" is a configurable component that processes messages for routing purposes.

Example classifications:
- importer: import a message from an "external" source e.g. a Redis queue
- router: dispatch a message to other internal processors
- translator: translate messages between different protocols
- filter: eliminate messages
- aggregator: aggregate multiple messages into a new aggregated message
- exporter: export a message e.g. push to a Redis queue


## Use-case example  

A simple use-case we wish to fulfil is a reliable pubsub, implemented as follows:
- pop an incoming message from a Redis "producer queue"
- push each incoming message onto multiple parallel "consumer queues"

If a consumer is busy, or crashed, its messages are still delivered when it is available again, via its Redis queue.

We compose basic processors to implement this process as follows:
- an importer to pop incoming messages from the "producer queue"
- a fan-out processor to multiple exporters
- each exporter pushes to its "consumer queue"

Assuming the required processors are available in the Redix deployment, this approach then enables assembling such plumbing via runtime configuration. Hence we consider Redix as "duct-tape" for our application microservices.


## Configuration

Each processor is configured via a YAML file in the Redix `config` directory. (Such configuration should be managed using a private git repository, for versioning, with Redix as a dependency.)

The name of each processor (and its configuration file) is an "instance URI" e.g. `builtin/FileImporter.singleton.json.`

This name is comprised of its Node module, JavaScript class, and finally its distinguishing instance name.

The distinguishing name enables multiple instances of the same processor class, configured for different purposes. Otherwise we name the instance as `singleton.`

The "module" name enables custom and third-party processors e.g. a `myredix/FancyProcessor` where `myredix` is an `npm` module which exports a `FancyProcessor` class.

We wish to introduce a processor factory e.g. `builtin/FileImporter.factory.json,` to enable instances to be dynamically created by so messaging the factory.


## Learn more

Redix routing:
- https://github.com/evanx/redixrouter/blob/master/docs/redisRouting.md

HTTP request example:
- https://github.com/evanx/redixrouter/blob/master/test/httpRequest/
