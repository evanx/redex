
## Example: static web server

### ExpressJS HTTP importer

We "import" an HTTP request from an Express server via the `httpImporter` processor:
```yaml
description: Express webserver to import HTTP requests
loggerLevel: debug
port: 8888
timeout: 2000 # ms
route:
- router.regexpRouter.testpaths
```
where since we expect to serve static files, the timeout is relatively low.

Code snippet from the `httpImporter.js` implementation:
```javascript
app = express();
app.listen(config.port);
app.get('/*', async (req, res) => {
   try {
      seq += 1;
      let meta = {type: 'express', id: seq};
      let response = await redix.import(req, meta, config);
      assert(response, 'no response');
      assert(response.statusCode, 'no statusCode');
```

This listens on port `8888,` accepts an HTTP request, and produces a message as follows:
```json
{
   "url": "/test.txt",
   "method": "GET",
   "host": "localhost"
}
```
where this mirrors the ExpressJS `req.`


### URL path router

We forward the request to a `regexpRouter.testpaths` for our web server:
```yaml
description: Route HTTP messages
rules:
- description: Private
  pluck: url
  regexp: ^/private
  response:
    statusCode: 403
    content: Access forbidden
- description: Home
  pluck: url
  regexp: ^.*$
  route:
  - translator.expressFile.singleton
  - server.fileServer.singleton
```
where we specify of list of `rules.`

The `regexpRouter` will pluck the URL from message, which is an the ExpressJS request, and match it against RegExp rules.

We can hard-code an HTTP response e.g. 403 for "Access forbidden," or route the message to other processors, perhaps through filters and translators.

The `translator.expressFile.singleton` translates Express messages into "file" messages for the `fileServer,` e.g. the `url` is taken as the file path:
```json
{
   "path": "/test.txt"
}
```


### Virtual host router

A `regexpRouter` processor rule can be configured for virtual hosts as follows:
```yaml
- description: Route localhost to a file server
  pluck: hostname
  regexp: ^localhost$
  route:
  - translator.expressFile.singleton
  - server.fileServer.singleton
```
where we specify a RegExp rule based on the `hostname` plucked from the `req.`

Code snippet:
```javascript
async process(message, meta) {
   logger.info('process', meta);
   let rule = match(message);
   if (rule) {
      if (rule.route) {
         return redix.forward(message, meta, config, rule.route);
      } else if (rule.response) {
         return rule.response;
      } else {
         throw {
            message: 'interal error: no response or route',
            source: config.processorName,
            rule: rule.description
         };
      }
   }
   throw {
      source: config.processorName,
      message: 'no route'
   };
```
where we find a matching rule in order to `forward` the message accordingly.


### File server

Finally a `fileServer` processor serves a files from a specified `root` directory:
```yaml
description: Serve files e.g. for a webserver
root: /var/redixweb/root
index: index.html
fallback: index.html
```
where `root` is the file directory containing the static resources.

Code snippet:
```javascript
assert(message.path, 'file path');
let filePath = Paths.joinPath(config.root, message.path);
try {
   let stats = await Files.stat(filePath);
   if (stats.isDirectory()) {
      if (!config.index) {
         throw {message: 'no index: ' + message.path};
      } else {
         filePath = Paths.joinPath(filePath, config.index);
      }
   }
   logger.info('filePath', filePath);
   let data = await Files.readFile(filePath);
   return {
      type: 'data',
      dataType: 'string',
      data: data
   };
```
where we `stat` the file, use our configured `index` file for directories, and finally return the file data as a Node `Buffer.`


### ExpressJS request translator

In order to use the generic `fileServer` for our web server, we introduce a translator from ExpressJS requests into file requests"
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
   let reply = await redix.dispatch(transMessage, transMeta, route);
   assert(reply, 'empty reply');
   assert(reply.type, 'no reply type');
   assert(reply.type === 'data', 'reply type is not data: ' + reply.type);
   assert(reply.dataType === 'blob', 'reply data type unsupported: ' + reply.dataType);
   return {
      statusCode: 200,
      contentType: Paths.getContentType(path.extname(transMessage.path)),
      contentDataType: reply.dataType,
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


### Static blog generator

Another interesting use-case, is to transform markdown files containing blog entries, into a pretty HTML file according to a specified "skin" e.g. using ReactJS server-side rendering.


### Conclusion

We compose a web server using relatively simple processors. Those are sometimes fairly generic e.g. the RegExp message router.

We take the approach of building of a "complex" system via the "simple" configuration of "small" components.

One can replicate much of the functionality of Nginx for example, e.g. by implementing processors as required and wiring these anyhow.

As further use-case examples, we intend to implement processors to support HTTP redirect, URL rewrite, proxy, load balancing, caching and HTTPS termination. While each of these processors is relatively simple, clearly their composition can be useful.

While a custom Node script can achieve a desired process on its own, it is interesting to enable a custom server to be composed via configuration. Naturally custom Node processors can leverage third-party `npm` modules e.g. ExpressJS "middleware."

Having said that, in order to simplify configuration for common use-cases, we might introduce a pre-composed processor which is combines the functionality of a set processors in a hard-wired fashion.


## Learn more

Redix routing:
- https://github.com/evanx/redixrouter/blob/master/docs/redisRouting.md

Redix processor implementations:
- https://github.com/evanx/redixrouter/blob/master/processors/
