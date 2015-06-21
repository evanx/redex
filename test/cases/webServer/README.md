
## Example: static web server

As an exercise, we compose a basic static web server using the following components:
- ExpressJS HTTP importer
- RegExp router
- file server for a specific root directory


### ExpressJS HTTP importer

We "import" an HTTP request from an Express server via the `httpImporter` processor:
```yaml
label: Express web server to import HTTP requests
loggerLevel: debug
port: 8888
timeout: 2000 # ms
route:
- router.regex.paths
```
where since we expect to serve local files, the timeout is relatively low.

Code snippet from the `httpImporter.js` implementation:
```javascript
app = express();
app.listen(config.port);
app.get('/*', async (req, res) => {
   try {
      seq += 1;
      let meta = {type: 'express', id: seq};
      let response = await redex.import(req, meta, config);
      assert(response, 'no response');
      assert(response.statusCode, 'no statusCode');
```

This listens on port `8888,` accepts an HTTP request, and produces a message as follows:
```json
{
   "url": "/test.txt",
   "method": "GET",
   "hostname": "localhost"
}
```
where this mirrors the ExpressJS `req.`


### RegExp router for URL paths

We forward the request to a `router.regex.paths` for our web server:
```yaml
label: Route HTTP messages
rules:
- label: Private
  pluck: url
  regex: ^/private
  response:
    statusCode: 403
    content: Access forbidden
- label: Home
  pluck: url
  regex: ^.*$
  route:
  - http.translator.file.singleton
  - file.server.simple.singleton
```
where we specify of list of `rules.`

The `router.regex` will pluck the URL from message, which is an the ExpressJS request, and match it against RegExp rules.

We can hard-code an HTTP response e.g. 403 for "Access forbidden," or route the message to other processors, perhaps through filters and translators.

The `http.translator.file.singleton` translates Express messages into "file" messages for the `fileServer,` e.g. the `url` is taken as the file path:
```json
{
   "path": "/test.txt"
}
```

#### Virtual host router

A `router.regex.hosts` processor is configured for virtual hosts as follows:
```yaml
label: Route HTTP requests based on the hostname
pluck: hostname
rules:
- label: Route localhost to a file server
  regex: ^localhost$
  route:
  - http.translator.file.singleton
  - file.server.simple.singleton
```
where we specify a RegExp rule based on the `hostname` plucked from the `req.`

In this case we specify a default `pluck` property for `req.hostname.`

#### User-agent router

A further example will address user-agent routing e.g. using the `ua-parser` module.


#### RegExp router implementation

This processor finds a matching rule for the incoming message as follows:
```javascript
async process(message, meta) {
   let rule = match(message);
   if (rule) {
      if (rule.route) {
         return redex.forward(message, meta, config, rule.route);
      } else if (rule.response) {
         return rule.response;
      } else {
         throw {
            message: 'interal error: no response or route for rule: ' + rule.label,
            source: config.processorName,
            rule: rule.label
         };
      }
   }
   let error = {
      message: 'no matching rule',
      source: config.processorName
   };
   if (config.pluck && message[config.pluck]) {
      error.message = 'no rule for: ' + message[config.pluck],
   }
   throw error;
}
```
where we implement the following logic:
- we find a matching rule
- then `forward` the message accordingly
- else throw an error

Note that this router is generic, and reusable for purposes other than HTTP requests.


### File server

Finally a `fileServer` processor serves a files from a specified `root` directory:
```yaml
label: Serve files e.g. for a web server
root: /var/redexweb/root
index: index.html
fallback: index.html
```
where `root` is the file directory containing the static resources.

Note that this server is fairly generic, and reusable for purposes other than HTTP requests.


#### File server processor implementation

Code snippet:
```javascript
assert(message.path, 'file path');
let filePath = Paths.join(config.root, message.path);
try {
   let stats = await Files.stat(filePath);
   if (stats.isDirectory()) {
      if (!config.index) {
         throw {message: 'no index: ' + message.path};
      } else {
         filePath = Paths.join(filePath, config.index);
      }
   }
   logger.debug('filePath', filePath);
   let data = await Files.readFile(filePath);
   return {
      type: 'data',
      dataType: 'string',
      data: data
   };
```
where we `stat` the file, use our configured `index` file for directories, and finally return the file data as a Node `Buffer.`


### ExpressJS request translator

In order to use the generic `fileServer` for our web server, we introduce a translator from ExpressJS requests into file requests:
```javascript
async process(message, meta, route) {
   logger.info('process', meta);
   if (meta.type !== 'express') {
      throw {message: 'Unsupported type: ' + meta.type};
   }
   let transMessage = {
      path: message.url
   };
   let transMeta = {
      type: 'file',
      translator: config.processorName,
      orig: meta
   };
   let reply = await redex.dispatch(transMessage, transMeta, route);
   assert(reply, 'empty reply');
   assert(reply.type, 'no reply type');
   assert(reply.type === 'data', 'reply type is not data: ' + reply.type);
   assert(reply.dataType === 'blob', 'reply data type unsupported: ' + reply.dataType);
   return {
      statusCode: 200,
      contentType: Paths.getContentType(path.extname(transMessage.path)),
      dataType: reply.dataType,
      content: reply.data
   }
}
```
where we take the HTTP `url` as the file `path,` and translate the reply into a HTTP response.

Note the above implementation is limited to handling a "blob" of the file content, as opposed to a Node stream, which is something we wish to support later.


### Directory listings

Rather than the `index` file option, we might enable listing directories in our `fileServer:`
```yaml
listDirectory: true
```

Alternatively, we introduce a `fileStat` router, which can route requests based on whether that file is a directory, or if given file exists e.g. to support something akin to Nginx's `try_files` feature.

If the file is a directory, the request might be routed to a `directoryServer` processor which lists files in that directory. Messages destinated for a directory server could be intercepted and filtered.

Say the directory server reply includes an array of files. That might be modified by a `replyArrayModifier` e.g. to hide files in a directory listing. Finally, a translator might transform that array into a pretty HTML document.


### Meta configurator for a static web server

We introduce a configurator to simplify the configuration for a given pattern of collaborating processors.

We configure an `httpFileServer.default` pattern as follows:
```yaml
label: static web server meta configuration for httpFileServer configurator
loggerLevel: debug
port: 8880
root: /var/redexweb/root
timeout: 2000
```

Configurators automate the configuration of a specific pattern of processors as a whole.

See the implementation for a configurator for a static web server:
- https://github.com/evanx/redex/blob/master/configurators/httpFileServer.js


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
         label: "Express web server to import HTTP requests",
         port: config.port || 8880,
         timeout: config.timeout || 2000,
         route: [ names.translator, names.fileServer ]
      },
      {
         processorName: names.translator,
         label: "Translate ExpressJS http message to file message"
      },
      {
         processorName: names.fileServer,
         label: "Serve files for a web server",
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


### Conclusion

We compose a web server using relatively simple processors. Those are sometimes fairly generic e.g. the RegExp message router.

We take the approach of building of a "complex" system via the "simple" configuration of "small" components.

One can replicate much of the functionality of Nginx for example, by implementing processors as required and wiring these anyhow.

If sufficient processors exists, services can be built using runtime configuration, without requiring further programming.

As further use-case examples, we intend to implement processors to support HTTP redirect, URL rewrite, proxy, load balancing, caching and HTTPS termination. While each of these processors is relatively simple, clearly their composition can be useful.

#### Deconstruction and re-composition

One might implement an `httpFileServer` processor which expects an HTTP request message, and returns an HTTP response, i.e. with a built-in `expressFile` translator. Similarly, we might combine our ExpressJS HTTP importer and RegExp router into an `expressImporterRouter.`

However, while it is tempting to overload the functionality of processors, it is useful to decompose processors into smaller constituent processors. This affords flexibility and reuse.

While a custom Node script can achieve a desired process on its own, it is interesting to enable a custom server to be composed via configuration. Other processors can then be added into the mix e.g. for response caching.


### Further work

Enhancements:
- Support other HTTP verbs e.g. HEAD.
- Support HTTP headers such as `If-Modified-Since` to maybe return 403
- URL matching functionality built into an `expressHttpImporterRouter`

For HTTP handling:
- processors for HTTP proxy and redirect
- URL rewrite
- routing based on user-agent e.g. device type via `ua-parser` module
- analytics stored in Redis e.g. user-agent, geolocation
- response caching in Redis
- load balancing via Redis queues
- HTTPS termination
- OAUTH authentication
- RBAC authorisation

Render data into HTML:
- markdown files and their YAML metadata, e.g. for blog entries
- render analytics data stored in Redis
- render blog entries from data stored in Redis

Publish data as JSON:
- serve Redis data queries

Prepare data for web publishing:
- task to push modified file data into Redis e.g. blog entries
- image resizing server

Publish notifications:
- a webhook exporter to emit notifications via HTTP from Redis queues


## Learn more

Configuration files for this static web server example:
- https://github.com/evanx/redex/tree/master/test/cases/webServer/config

Redex processor implementations:
- https://github.com/evanx/redex/tree/master/processors/

Redex routing:
- https://github.com/evanx/redex/blob/master/docs/redexRouting.md
