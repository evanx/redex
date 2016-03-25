# Redex Router

## Overview

The name "Redex" can be interpreted as "Redis-based message exchange."

Redex is a tool for:
- systems integration
- orchestration of microservices

Redex is a Node framework for building:
- reliable messaging via Redis
- communicating sequential processors (CSP)
- reusable processesors that are configurable and composable with YAML
- distributed web infrastructure

My rationale for this project is:
- favour Redis, Node, ES'16, YAML for the assembly of CSPs
- produce a framework for the Actor model of concurrency
- produce a extensible platform for messaging and orchestration
- produce a distributed (resilient, scalable) web server
- to study distributed computing patterns

### Installing

On Ubuntu, run the following commands to `git clone` etc:
```shell
cd
git clone https://github.com/evanx/redex
cd redex
cat package.json
npm install
git submodule init
git submodule update
sh scripts/test/check.sh
npm test
```
which will clone the Redex github repo into your home directory.

We invoke `git submodule` for the `util` directory which is: https://github.com/evanx/redexutil. This is a subproject for generally applicable utils.


### Demo: static web server

To demonstrate a static web server, run Redex as follows:
```shell
cd ~/redex
nodejs index.js http | node_modules/bunyan/bin/bunyan -o short
```

Try the following in your browser:
- [http://localhost:8880](http://localhost:8880)
- [http://localhost:8880/redex](http://localhost:8880/redex)

Notes:
- the default document root is the current working directory
- the default index file is configured as `README.md`
- the `/redex` route is configured to serve the state of the Redex instance

Alternatively use the following script:
```shell
sh ~/redix/scripts/http.run.sh
```

See:
- https://github.com/evanx/redex/blob/master/scripts/http.run.sh

See the "configurator" config and implementation:
- https://github.com/evanx/redex/blob/master/config/configurator.httpFileServer.default.yaml
- https://github.com/evanx/redex/blob/master/configurator/httpFileServer.js


### Running tests

Check the test scripts as follows:
```shell
sh scripts/test/check.sh
```

Run the tests as follows:
```shell
sh scripts/test/all.sh
```

If any test fails, try running again, as the system is warmer. These integration tests have low timeouts which are not always sufficient.

If the test script "hangs" for more than 5 seconds or so, then there might be a problem. Press Ctrl-C and try it again. Tweet me @evanxsummers if the problem persists.

See:
- https://github.com/evanx/redex/tree/master/scripts/test/cases
- https://github.com/evanx/redex/tree/master/scripts/test/check.sh
- https://github.com/evanx/redex/tree/master/scripts/test/all.sh


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


### Rationale

We wish to leverage ES'16, Node and Redis because:
- Redis is a high-performance server for persistent data structures
- Node is a popular platform for building asynchronous infrastructure
- ES'16 sugars the synchronisation of async coroutines via the "await" keyword
- ES'16 sugars the error handling of chained promises via exceptions

### Goals

- commit to ES'16 async functions i.e. await promise resolution, with try/catch for error handling
- release version 1.0 in 2016 when ES'16 is standardised
- distributable via replicas running against the same Redis server
- scalable and reliable, especially when using Redis Cluster
- be inspired by functional programming (e.g. immutable state i.e. no side-effects)
- stateless processors, otherwise explicit state mutation via Redis


### Node.js and its alternatives

The core functionality of Redex is quite trivial:
- enable the configuration of multiple "processor" instances (as components of a system)
- enable sequential message-passing between processors

Someone might want to copy this in Go, Rust, D, Elixer, etc. I think that would be a great idea. Still, having a Node implementation in plain JavaScript is useful, at least for JavaScript developers.

Arguably we are trading off performance in favour extensibility by a broader audience.

We have chosen ES'16 (via Babel), and might extend our implementation with TypeScript in future.


## Redex and its alternatives

We implement a number of processors to support some use-cases, especially around HTTP and Redis. Consequently Redex is a ready-made implementation for some use-cases.

Where it is an alternative to other projects, I will "compare and contrast" here. (Please let me know of any that I am missing.)


### Alternative: Nginx

Redex can be configured as an HTTP gateway, and so is an alternative to Nginx for some use-cases.

Similarities:
- Both can be configured as a static web server, proxy server

Differences:
- Redex is an experimental, pre-alpha pet project for study purposes
- Redex has only a tiny subset of Nginx's features
- Redex uses YAML for configuration
- Redex is extensible using JavaScript e.g. custom "processors" using Node middleware
- Distributed Redex instances are intended to collaborate via Redis

Notes:
- Redex and Nginx can be used together e.g. where one proxies requests to the other
- We intend to reduce the feature gap between Redex and Nginx
- Redex uses ExpressJS

See examples:
- https://github.com/evanx/redex/tree/master/config/
- https://github.com/evanx/redex/tree/master/test/cases/expressRouter/
- https://github.com/evanx/redex/tree/master/test/cases/webServer/


### Alternative: js-csp

Analysis still required.


### Alternative: node-csp

Analysis still required.


### Alternative: ZeroMQ

Analysis still required.


### Alternative: RabbitMQ

Analysis still required.


### AWS ELB

Analysis still required.


## Road map

We intend to implement processors to demonstrate various use-cases, roughly planned as follows:

Implemented as PoC:
- framework (configuration, message dispatching)
- import and export for Redis queues
- static web server (http importer, regex router, markdown renderer, file server)
- HTTP response caching in Redis
- HTTP importer/router (combination ExpressJS importer with builtin router)

Current work:
- HTTP proxy
- Service registry (for service orchestration)

Next work:
- Service discovery
- redis query server with joins
- fanout dispatcher (for parallel pipelines)
- HTTP load balancer
- HTTPS termination
- API gateway with authentication and authorisation
- WebSocket server to push notications into the browser

Unscheduled:
- integration with ZeroMQ, RabbitMQ, Protobuf
- analytics server for web apps
- centralised logging server using TCP/IP sockets
- outgoing email server using SMTP over TCP/IP sockets
- file-based blogging using Ghost templates


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

Each processor is configured via a YAML file e.g. in a `config` directory for the Redex instance. (Such configuration should be managed using a private git repository, for versioning, with Redex as a dependency.)

Alternatively, a single YAML config file can be used for all processors for a specific deployment.

The name of each processor (and its configuration file) is an "instance URI" e.g. `builtin/file.importer.default.singleton.json.`

This name is comprised of its Node module, JavaScript class, and finally its distinguishing instance name.
The class for the above processor is resolved as `lib/file/importer/default.js.`

The distinguishing name enables multiple instances of the same processor class, configured for different purposes. Otherwise we name the instance as `singleton.`

The "module" name enables custom and third-party processors e.g. a `myredex/FancyProcessor` where `myredex` is an `npm` module which exports a `FancyProcessor` class.

We wish to introduce a processor factory e.g. `builtin/file/importer/factory.json,` to enable instances to be dynamically created by so messaging the factory.


## Learn more

Redex routing:
- https://github.com/evanx/redex/blob/master/docs/redexRouting.md

Web server examples:
- https://github.com/evanx/redex/tree/master/config/
- https://github.com/evanx/redex/tree/master/test/cases/expressRouter/
- https://github.com/evanx/redex/tree/master/test/cases/webServer/
- https://github.com/evanx/redex/tree/master/test/cases/httpRequest/

Redex processor implementations:
- https://github.com/evanx/redex/tree/master/processors/

Service self-registration:
- https://github.com/evanx/redex/tree/master/test/cases/serviceRegistry

## Related

See https://github.com/evanx/chronica which has similar configurable component model.
