
## Service registry

This processor registers itself as a service.

In this case, we have chosen to configure all the processors' `configs` in a single YAML file as follows:

```yaml
label:
loggerLevel: debug
configs: # for collaborating processors for this use-case
- processorName: http.registry
  label:
```
where we configure:
-

### Implementation

See the implementation of the `http.registry` processor:
https://github.com/evanx/redex/blob/master/processors/http/registry/registrant.js

```javascript
```

#### Redex state

This processor introspects the state of the active components and returns as JSON:

<img src="http://evanx.github.io/images/redex/redex-state-expressRouter.png" width="500" border="1"/>
<hr>

### Running

We run this configuration using the following script:
```shell
evans@boromir:~/redex$ cat scripts/registry.run.sh
  nodejs index.js test/cases/serviceRegistry/registrant.yaml | bunyan -o short
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
