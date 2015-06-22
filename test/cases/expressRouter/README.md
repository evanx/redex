
## ExpressJS HTTP importer with built-in path router

This processor leverages ExpressJS, and is a combined HTTP importer and router.

In this case, we have chosen to configure all the processors' `configs` in a single YAML file as follows:

```yaml
label: All-in-one config for static web server
loggerLevel: debug
configs: # for collaborating processors for this use-case
- processorName: http.importer.expressRouter.singleton
  label: Express HTTP importer with builtin router
  port: 8880
  timeout: 5000 # milliseconds
  gets:
  - label: Respond with Redex processors' state in JSON i.e. for debugging
    path: /redex
    route:
    - redex.state.singleton
    disabled: false
  - label: Reject this path with 403 (Access prohibited)
    path: /private
    response:
      statusCode: 403
      content: Sorry, forbidden
  - label: Otherwise to file server
    path: /
    route:
    - http.renderer.markdown.singleton # will render README.md to HTML
    - http.translator.file.singleton
    - file.server.simple.singleton
- processorName: file.server.simple.singleton
  root: . # cwd
  index: README.md
```
where we configure three paths:
- a special Redex "state" responder, with JSON data, for debugging
- a private area with a hardcoded response status code (HTTP 403) and message
- finally, a file server

The request is passed through a markdown renderer. This will convert a reply with markdown content e.g. `~/redex/README.md,` into HTML content as follows:

```javascript
if (meta.type === 'express') {
   if (lodash.endsWith(meta.filePath, '.md')) {
      if (reply.contentType === 'text/plain') {
         let content = reply.content.toString();
         reply.content = marked(content);
         reply.contentType = 'text/html';
```
where we are using the `marked` library for this purpose.

The `http.translator.file` processor translates an HTTP request message into a "file" message. This merely takes the HTTP path as the file path expected by the rather generic `file.server.simple` processor. It then translates the file content reply into an HTTP 200 message. (A file server with built-in support for HTTP messages, is perhaps something to consider as a further option. This would slightly simplify the required configuration by obviating the need for such a translator.)

```javascript
let fileMessage = {path: message.url};
let fileMeta = {type: 'file'};
let reply = await redex.dispatch(fileMessage, fileMeta, route);
return {
   statusCode: 200,
   contentType: Paths.getContentType(path.extname(fileMessage.path)),
   content: reply.data,
   filePath: fileMessage.path // send back e.g. README.md for the markdown renderer
}
```

Finally the file server is configured with a document root directory.

```javascript
async process(message, meta) {
   if (meta.type !== 'file') {
      throw {message: 'unsupported type: ' + meta.type};
   }
   assert(message.path.indexOf('..') < 0, 'valid path');
   if (message.path === '/') {
      message.path = config.index;
   }
   let filePath = Paths.join(config.root, message.path);
   try {
      let stats = await Files.stat(filePath);
      if (stats.isDirectory()) {
         filePath = Paths.join(filePath, config.index);
      }
      let data = await Files.readFile(filePath);
      return {
         type: 'data',
         dataType: 'Buffer',
         data: data
      };
```

Note the Redex state, markdown and translator processors do not have any configuration per se, but are explicitly listed as follows:
```yaml
- processorName: redex.state.singleton
- processorName: http.renderer.markdown.singleton
- processorName: http.translator.file.singleton
```
Perhaps these could be automatically configured e.g. by a config "decorator." Since they are referenced in a `route,` they are implicitly required to be instantiated.


### Implementation

See the implementation of the `http.importer.expressRouter` processor:
https://github.com/evanx/redex/blob/master/processors/http/importer/expressRouter.js

We add each configured `path` for HTTP GET methods to the ExpressJS `app` as follows.
```javascript
function add(item) {
   assert(item.path, 'path: ' + item.label);
   assert.equal(item.path[0], '/', 'absolute path: ' + item.path);
   app.get(item.path, async (req, res) => {
      try {
         let meta = {type: 'express'};
         if (item.route) {
            let response = await redex.import(req, meta, {
               processorName: config.processorName,
               timeout: item.timeout || config.timeout,
               route: item.route,
            });
            sendResponse(item, req, res, response);
         } else if (item.response) {
            sendResponseStatus(item, req, res, item.response);
         } else {
            assert(false, 'no route or response: ' + item.label);
         }
      } catch (error) {
         sendError(item, req, res, error);
      }
   });
}
```

### Running

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

<img src='http://evanx.github.io/images/redex/redex-state.png' width='600' border='1'/>

## Learn more

Other web server examples:
- https://github.com/evanx/redex/tree/master/config/
- https://github.com/evanx/redex/tree/master/test/cases/webServer/
