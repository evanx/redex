
### Example: static web server

Say we accept an HTTP request from an Express server.

We configure an `httpImporter.`
```yaml
description: Express webserver to import HTTP requests
loggerLevel: debug
port: 8888
timeout: 2000 # ms
route:
- router.regexpRouter.webserver
```

This accepts an HTTP request and forwards it to a `regexpRouter` for our web server:
```yaml
description: Route HTTP messages
rules:
- description: Private
  pluck: url
  regexp: ^/private
  response:
    statusCode: 403
    content: Access forbidden
- description: Test
  pluck: url
  regexp: ^/test.txt$
  route:
  - translator.expressFile.singleton
  - server.fileServer.singleton
- description: Home
  pluck: url
  regexp: ^/index.html$
  route:
  - translator.expressFile.singleton
  - server.fileServer.singleton
- description: Unsupported route
  pluck: url
  regexp: .*
  route:
  - router.regexpRouter.forbidden
```
where we specify of list of `rules.`

The `regexpRouter` will pluck the URL from message, which is an the ExpressJS request, and match it against RegExp rules.

We can hard-code an HTTP response e.g. 403 for "Access forbidden," or route the message to other processors, perhaps through filters and translators.

The `translator.expressFile.singleton` translates Express messages into "file" messages for the `fileServer,` e.g. the `url` is taken as the file path.

Finally our `fileServer` serves files:
```yaml
description: serve files e.g. for a static webserver
root: root
index: index.html
```

## Conclusion

We compose a web server using relatively simple processors. Those are sometimes fairly generic e.g. the RegExp message router.

We take the approach of building of a "complex" system via the "simple" configuration of "small" components.


## Learn more

Redix routing:
- https://github.com/evanx/redixrouter/blob/master/docs/redisRouting.md

Redix processor implementations:
- https://github.com/evanx/redixrouter/blob/master/processors/
