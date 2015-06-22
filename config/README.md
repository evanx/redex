
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

We implement `configurators/httpFileServer` as follows:
```javascript
export default function(config) {
   const names = {
      importer: 'importer.httpImporter.singleton',
      translator: 'http.translator.file.singleton',
      fileServer: 'file.server.simple.singleton'
   };
   return [
      {
         processorName: names.importer,
         label: 'Express web server to import HTTP requests',
         port: config.port || 8880,
         timeout: config.timeout || 2000,
         route: [ names.translator, names.fileServer ]
      },
      {
         processorName: names.translator,
         label: 'Translate ExpressJS http message to file message'
      },
      {
         processorName: names.fileServer,
         label: 'Serve files for a web server',
         root: config.root || '.',
         index: config.index || 'index.html',
      }
   ]
}
```
where we generate the required configuration for three processors:
- an ExpressJS HTTP importer
- a translator from "http" to "file" type messages
- a file directory server.

The HTTP importer is configured with the `port` and `timeout.`

The file server is configured with the document root directory and the default index file e.g. `index.html.`

Other web server examples:
- https://github.com/evanx/redex/tree/master/test/cases/expressRouter/
- https://github.com/evanx/redex/tree/master/test/cases/webServer/
