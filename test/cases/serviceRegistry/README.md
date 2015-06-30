
## Service registry

The `server.registrant` processor registers itself as a service.

See https://github.com/evanx/redex/blob/master/processors/service/registrants.yaml

In this case, we have chosen to configure all the processors' `configs` in a single YAML file as follows:

```yaml
- processorName: service.registrant.singleton1
  namespace: redex:test:service:http
  address: localhost:8881
  timeout: 4s # subtracted from deadline
  ttl: 10s

- processorName: service.registrant.singleton2
  namespace: redex:test:service:http
  address: localhost:8882
  ttl: 20s
  shutdown: true
```
where we configure two registrants.

### Implementation

See the implementation of the `service.registrant` processor:
https://github.com/evanx/redex/blob/master/processors/service/registrant.js

```javascript

```

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

Resources:
-

## Learn more

Other examples:
- https://github.com/evanx/redex/tree/master/config/
- https://github.com/evanx/redex/tree/master/test/cases/expressRouter/
