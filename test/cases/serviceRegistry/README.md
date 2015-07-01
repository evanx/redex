
## Service registry

The `server.registrant` processor registers itself as a service.

See the test case configuration:
https://github.com/evanx/redex/blob/master/test/cases/serviceRegistry/registrants.yaml

In this case, we have chosen to configure all the processors' `configs` in a single YAML file, including two registrants as follows:

```yaml
- processorName: service.registrant.singleton1
  namespace: redex:test:service:http
  address: localhost:8881 # address of the server we register
  ttl: 10s

- processorName: service.registrant.singleton2
  namespace: redex:test:service:http
  address: localhost:8882
  ttl: 20s
  shutdown: true # shutdown this Redex after deregistering
```

### Implementation

See the implementation of the `service.registrant` processor:
https://github.com/evanx/redex/blob/master/processors/service/registrant.js

This processor pops an available registry `id:`
```javascript
async function pop() {
   const id = await redis.brpoplpush(config.namespace + ':q',
      config.namespace + ':p', config.popTimeout);
   if (lodash.isEmpty(id)) {
      return;
   }
   addedPending(id);
   try {
      register(id);
   } catch (err) {
      revertPending(id, err);
      throw err;
   } finally {
      removePending(id);
   }
}
```

We register our service instance for this `id:`
```javascript
async function register(id) {
   logger.debug('register', id);
   let time = await redis.timeSeconds();
   let expiry = ttl + time;
   registration = { id, address, expiry };
   let setCount = await redis.hmset(config.namespace + ':' + id, registration);
   if (setCount != 1) {
      logger.debug('hmset', id, setCount);
   }
   let addCount = await redis.sadd(config.namespace + ':ids', id);
   if (addCount !== 1) {
      logger.warn('sadd', id, addCount);
   }
}
```
This performs the following steps:
- register information in the map for our adopted unique `id,` especially the address e.g. `localhost:8080`
- add the `id` to the Redis set of available instances e.g for discovery by load balancer

When the `id` is removed from the set, we can deregister and shutdown this instance.
```javascript
let sismemberReply = await redis.sismember(config.namespace + ':ids', registration.id);
if (!sismemberReply) {
   deregister();
} else {
   let time = await redis.timeSeconds();
   if (registration.expiry) {
      if (time > registration.expiry) {
         logger.warn('expired', registration, time);
```
Note that we might self-shutdown when expired. This is acceptable if the load balancer takes care not send requests to expired services, and we synchronise by the same Redis server time. Actually the load balancer will have a request timeout of some seconds. It deducts this timeout from expiry time of the service, as its deadline. (It might deduct double the timeout for good measure.)

## Running

We run this configuration using the following script:
```shell
evans@boromir:~/redex$ cat scripts/registry.run.sh
  nodejs index.js test/cases/serviceRegistry/registrants.yaml | bunyan -o short
```

Then try the following in your browser:
- [http://localhost:8880/redex](http://localhost:8880/redex)

Notes:
- the `/redex` route is configured to serve the state of the Redex instance

## Learn more

Other examples:
- https://github.com/evanx/redex/tree/master/test/cases/expressRouter/
