
## Redis query

The `redis.query` processor retrieves data from Redis.

See the test case configuration:
https://github.com/evanx/redex/blob/master/test/redisQuery/redex.yaml

In this case, we have chosen to configure all the processors' `configs` in a single YAML file:

```yaml
- processorName: redis.query.singleton
  namespace: redex:test:query
```

### Implementation

See the implementation of the `redis.query` processor:
https://github.com/evanx/redex/blob/master/processors/redis/query.js

```javascript
export default class Query {
   redis = new Redis({});
}
```

## Running

We run this configuration using the following script:
```shell
evans@boromir:~/redex$ cat test/redisQuery/run.sh
  nodejs index.js test/redisQuery/redex.yaml | bunyan -o short
```

Then try the following in your browser:
- [http://localhost:8880/redex](http://localhost:8880/redex)

Notes:
- the `/redex` route is configured to serve the state of the Redex instance

## Learn more

Other examples:
- https://github.com/evanx/redex/tree/master/test/cases/expressRouter/
