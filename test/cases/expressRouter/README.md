
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

See the implementation:
- https://github.com/evanx/redex/blob/master/processors/http/importer/expressRouter.js
