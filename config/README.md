
## Configurators

Configurators enable the configuration of a specific pattern of processors as a whole.


### Example: meta configurator for a static web server

We configure an `httpFileServer.default` pattern as follows:
```yaml
description: static web server configuration for the httpFileServer configurator
loggerLevel: debug
port: 8880
root: /var/redexweb/root
timeout: 2000
```
See the implementation for `configurators/httpFileServer` as follows:
- https://github.com/evanx/redexrouter/blob/master/configurators/httpFileServer.js

#### Implementation of HTTP file server configurator

We implement `configurators/httpFileServer` as follows:
```javascript
export default function(config) {
   const names = {
      importer: 'importer.httpImporter.singleton',
      translator: 'translator.expressFile.singleton',
      fileServer: 'server.fileServer.singleton'
   };
   return [
      {
         processorName: names.importer,
         description: 'Express web server to import HTTP requests',
         port: config.port || 8880,
         timeout: config.timeout || 2000,
         route: [ names.translator, names.fileServer ]
      },
      {
         processorName: names.translator,
         description: 'Translate ExpressJS http message to file message'
      },
      {
         processorName: names.fileServer,
         description: 'Serve files for a web server',
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
