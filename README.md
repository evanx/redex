
# Redex Router


### Installing

On Ubuntu, run the following commands to `git clone` and `npm install.`
```shell
cd
if git clone https://github.com/evanx/redex
then
  cd redex
  cat package.json
  npm install
fi
```
which will clone the Redex github repo into your home directory.


### Usage

To demonstrate a static web server, from the document root, run Redex as follows:
```shell
nodejs ~/redex/index.js http | bunyan -o short
```
and then try the following in your browser:
- [http://localhost:8880](http://localhost:8880)
- [http://localhost:8880/redex](http://localhost:8880/redex)


### Running tests

Check the test scripts as follows:
```shell
sh scripts/test/cat.test.scripts.sh
```

Run the tests as follows:
```shell
sh scripts/test/all.sh
```

If any test fails, try running again, as the system is warmer. These integration tests have low timeouts which are not always sufficient.

If the test script "hangs" for more than 5 seconds or so, then there might be a problem. Press Ctrl-C and try it again. Tweet me @evanxsummers if the problem persists.

See:
- https://github.com/evanx/redex/tree/master/scripts/test/auto
- https://github.com/evanx/redex/tree/master/scripts/test/cat.test.scripts.sh
- https://github.com/evanx/redex/tree/master/scripts/test/all.sh


### Static webserver

As per the CLI static webserver test:
```shell
mkdir -p ~/tmp/redex
cd ~/tmp/redex
echo 'test me' > test.txt
curl -s http://localhost:8880/test.txt
nodejs ~/redex/index.js http
```
and then try `http://localhost:8880` in your browser.

Note that you can try to invoke Redex with `http` command-line argument in any subdirectory which you wish to serve.

See
- https://github.com/evanx/redex/blob/master/scripts/test/auto/cli.http.simple.sh


## Overview

The name "Redex" can be interpreted as "Redis-based message eXchange."

Redex is a tool for:
- systems integration
- orchestration of microservices

Redex is a Node framework for:
- communicating sequential processors (CSP)
- reliable messaging through Redis queues
- building resilient web infrastructure
- custom messaging middleware

Goals:
- commit to ES7 async functions i.e. await promise resolution, with try/catch for error handling
- release version 1.0 in 2016 when ES7 is standardised
- distributable via replicas running against the same Redis server
- scalable and reliable, especially when using Redis Cluster
- be inspired by functional programming (e.g. immutable state i.e. no side-effects)
- stateless processors, otherwise explicit state mutation via Redis


## Problem/Solution

Problem:
- We wish to decouple our systems and microservices and enable their collaboration through messaging e.g. via HTTP, Redis queues, etc.

Solution:
- In practice we need to reconfigure such wiring at runtime as an operational concern. For this purpose, use we introduce Redex.


## Cost/Benefit

Benefit:
- enables building custom infrastructure via the configuration and composition of ready-made processors

Cost:
- configuration is less flexible than code
- configuration is required for each processor in a required processing pattern

Cost mitigation:
- custom processors can be implemented
- "configurators" can automate the configuration of individual processors


## Rationale

We wish to leverage ES7, Node and Redis because:
- Redis is a high-performance server for persistent data structures
- Node is a popular platform for building asynchronous infrastructure
- ES7 sugars the synchronisation of async coroutines via the "await" keyword
- ES7 sugars the error handling of chained promises via exceptions


## Alternatives

The core functionality of Redex is quite trivial:
- enable the configuration of multiple "processor" instances (as components of a system)
- enable sequential message-passing between processors

Someone else might want to re-implement something similar in Go, Rust, D, Elixer, etc. I think that would be a great idea. Still, having a Node implementation is useful, at least for JavaScript developers.

We have chosen ES7 (via Babel), and might extend with TypeScript in future. Other implementations that transpile to JavaScript would also be interesting, e.g. CoffeeScript, ClojureScript, et al.

If you have something alternative please let me know. I should list, compare and contrast alternatives.


### Alternative: Nginx

Similarities:
- Redex can perform the same function as Nginx for some limited use-cases
- Both can be used to build a static webserver, proxy server
- Both support caching

Differences:
- Nginx is mature, powerful, stable and performant
- Redex leverages ExpressJS
- Redex itself is pre-alpha i.e. not ready for production
- Nginx is scriptable using Lua
- Redex is extensible using JavaScript
- Redex does not yet support HTTPS and many other features of Nginx
- Redex uses YAML for configuration
- Redex uses Redis for caching

Notes:
- Redex and Nginx can be used together e.g. where one proxies requests to the other
- We intend to reduce the feature gap between Redex and Nginx
- Redex itself is simple, as it leverages ExpressJS and Redis

### Alternative: js-csp

Analysis still required.


### Alternative: node-csp

Analysis still required.


### Alternative: ZeroMQ

Analysis still required.


### Alternative: RabbitMQ

Analysis still required.


## Road map

We intend to implement processors to demonstrate various use-cases, roughly planned as follows:

Implemented as incomplete PoC:
- framework (configuration, message dispatching)
- import and export for Redis queues
- static web server (http importer, regex router, file server)

Current work:
- HTTP response caching in Redis
- HTTP proxy
- HTTP importer/router (combination ExpressJS importer with builtin router)

Next work:
- redis query server with joins
- fanout dispatcher (for parallel pipelines)

July 2015 - PoC:
- basic processors for HTTP and Redis queues
- web server with proxy and caching
- redis query server with joins

September 2015 - web:
- sample configuration for reliable pubsub and work queues
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

Application microservices, and Redex processors, are ideally message-passing "actors" and otherwise use Redis transactions to access "shared memory" in Redis.

We note that Node itself is designed to be "asynchronous infrastructure for concurrent apps," driven by a single-threaded event loop.


## Processors

A Redex instance is composed with collaborating "processors."

A Redex "processor" is a configurable component that processes messages for routing purposes.

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

Assuming the required processors are available in the Redex deployment, this approach then enables assembling such plumbing via runtime configuration. Hence we consider Redex as "duct-tape" for our application microservices.


## Configuration

Each processor is configured via a YAML file in the Redex `config` directory. (Such configuration should be managed using a private git repository, for versioning, with Redex as a dependency.)

The name of each processor (and its configuration file) is an "instance URI" e.g. `builtin/importer.FileImporter.singleton.json.`

This name is comprised of its Node module, JavaScript class, and finally its distinguishing instance name.
The class for the above processor is resolved as `lib/importer/FileImporter.js.`

The distinguishing name enables multiple instances of the same processor class, configured for different purposes. Otherwise we name the instance as `singleton.`

The "module" name enables custom and third-party processors e.g. a `myredex/FancyProcessor` where `myredex` is an `npm` module which exports a `FancyProcessor` class.

We wish to introduce a processor factory e.g. `builtin/FileImporter.factory.json,` to enable instances to be dynamically created by so messaging the factory.


## Learn more

Redex routing:
- https://github.com/evanx/redex/blob/master/docs/redisRouting.md

HTTP request example:
- https://github.com/evanx/redex/tree/master/test/case/httpRequest/

Static web server example:
- https://github.com/evanx/redex/tree/master/test/case/webServer/
