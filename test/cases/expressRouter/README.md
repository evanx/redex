
## expressRouter

This processor leverages ExpressJS, and is a combined HTTP importer and router.

In this case, we have chosen to configure all the processors' `configs` in a single YAML file as follows:

```yaml
label: Meta config for static web server
loggerLevel: debug
configs:
- processorName: http.importer.expressRouter.singleton
  label: Express HTTP importer with builtin router
  port: 8880
  timeout: 30000
  gets:
  - label: Redex state
    path: /redex
    route:
    - redex.state.singleton
    disabled: false
  - label: Otherwise to file server
    path: /
    route:
    - http.renderer.markdown.singleton
    - http.translator.file.singleton
    - file.server.simple.singleton

- processorName: redex.state.singleton
- processorName: http.renderer.markdown.singleton
- processorName: http.translator.file.singleton

- processorName: file.server.simple.singleton
  root: .
  index: README.md
```

See the implementation of the `http.importer.expressRouter` processor:
- https://github.com/evanx/redex/blob/master/processors/http/importer/expressRouter.js

We run this configuration using the following script:
```shell
evans@boromir:~/redex$ cat scripts/expressRouter.run.sh
  nodejs index.js test/cases/expressRouter/expressRouter.yaml | bunyan -o short
```

Then try the following in your browser:
- [http://localhost:8880](http://localhost:8880)
- [http://localhost:8880/redex](http://localhost:8880/redex)

Notes:
- the default document root is the current working directory
- the default index file is configured as `README.md`
- the `/redex` route is configured to serve the state of the Redex instance


## Learn more

Other web server examples:
- https://github.com/evanx/redex/tree/master/config/
- https://github.com/evanx/redex/tree/master/test/cases/webServer/
