
## Configurators

Configurators enable the configuration of a specific pattern of processors as a whole.


### Example: meta configurator for a static web server

We configure an `httpFileServer.default` pattern as follows:
```yaml
label: static web server configuration for the httpFileServer configurator
loggerLevel: debug
port: 8880
root: /var/redexweb/root
timeout: 2000
```
See the implementation for `configurators/httpFileServer` as follows:
- https://github.com/evanx/redex/blob/master/configurators/httpFileServer.js

<hr>
<img src="http://evanx.github.io/images/redex/redex-state.png" width="600"/>
<hr>

#### Implementation of HTTP file server configurator

We implement `configurator/httpFileServer` as follows:
```javascript
export default function createConfigs(config, redexConfig) {
   const names = {
      importer: 'http.importer.expressImporter.singleton',
      redexState: 'redex.state.singleton',
      router: 'http.router.urlRegex.singleton',
      markdownRenderer: 'http.renderer.markdown.singleton',
      httpTranslator: 'http.translator.file.singleton',
      fileServer: 'file.server.simple.singleton'
   };
   assert(config.port, 'port');
   assert(config.timeout, 'timeout');
   assert(config.root, 'root');
   assert(config.index, 'index');
   return [
      {
         processorName: names.importer,
         label: 'Express web server to import HTTP requests for the file server. ' +
         'We use the port and timeout specified in the configurator meta config.',
         port: config.port,
         timeout: config.timeout, // millis
         route: [ names.router ]
      },
      {
         processorName: names.router,
         label: 'Router for requests, by default to the file server',
         rules: [
            {
               label: 'Redex state',
               regex: '^/redex$',
               route: [ names.redexState ],
               disabled: !config.debug
            },
            {
               label: 'All to file server',
               regex: '^.*$',
               route: [ names.markdownRenderer, names.httpTranslator, names.fileServer ]
            }
        ]
      },
      {
         processorName: names.redexState,
         label: 'Redex state renderer showing processor configs'
      },
      {
         processorName: names.markdownRenderer,
         label: 'Translate markdown in http message content especially for README.md'
      },
      {
         processorName: names.httpTranslator,
         label: 'Translate ExpressJS http message to file message for fileServer'
      },
      {
         processorName: names.fileServer,
         label: 'Serve files for a web server. ' +
         'Using the root and index specified in the configurator meta config.',
         root: config.root, // document root of '.' will be process.cwd()
         index: config.index // e.g. README.md especially in case in ~/redex
      }
   ];
}
```
where we generate the required configuration for three processors:
- an ExpressJS HTTP importer
- a translator from "http" to "file" type messages
- a file directory server.

The HTTP importer is configured with the `port` and `timeout.`

The file server is configured with the document root directory and the default index file e.g. `README.md.`

<hr>
<img src="http://evanx.github.io/images/redex/redex-readme.png" width="450" border="1"/>
<hr>



## Learn more

Other web server examples:
- https://github.com/evanx/redex/tree/master/test/cases/expressRouter/
- https://github.com/evanx/redex/tree/master/test/cases/webServer/
