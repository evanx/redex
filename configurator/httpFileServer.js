
import assert from 'assert';

// A configurator is for a given pattern, e.g. a simple static web server in this case.
// It takes a wholistic config for that pattern e.g. port and document root.
// Using that config, it generates an array of processor configs
// e.g. a HTTP server (with the specified port),
// and a file reader (with the specified document root)

export default function createConfigs(config, redexConfig) {
   const names = {
      importer: 'http.importer.expressImporter.singleton',
      redexState: 'redex.state.singleton',
      router: 'http.router.urlRegex.singleton',
      markdownRenderer: 'http.renderer.markdown.singleton',
      httpTranslator: 'http.translator.file.singleton',
      fileServer: 'server.fileServer.singleton'
   };
   assert(config.port, 'port');
   assert(config.timeout, 'timeout');
   assert(config.root, 'root');
   assert(config.index, 'index');
   return [
      {
         processorName: names.importer,
         description: 'Express web server to import HTTP requests for the file server. ' +
         'We use the port and timeout specified in the configurator meta config.',
         port: config.port,
         timeout: config.timeout, // millis
         route: [ names.router ]
      },
      {
         processorName: names.router,
         description: 'Router for requests, by default to the file server',
         rules: [
            {
               //description: 'Redex state',
               regex: '^/redex$',
               route: [ names.redexState ],
               disabled: !config.debug
            },
            {
               description: 'All to file server',
               regex: '^.*$',
               route: [ names.markdownRenderer, names.httpTranslator, names.fileServer ]
            }
        ]
      },
      {
         processorName: names.redexState,
         description: 'Redex state renderer showing processor configs'
      },
      {
         processorName: names.markdownRenderer,
         description: 'Translate markdown in http message content especially for README.md'
      },
      {
         processorName: names.httpTranslator,
         description: 'Translate ExpressJS http message to file message for fileServer'
      },
      {
         processorName: names.fileServer,
         description: 'Serve files for a web server. ' +
         'Using the root and index specified in the configurator meta config.',
         root: config.root, // document root of '.' will be process.cwd()
         index: config.index // e.g. README.md especially in case in ~/redex
      }
   ];
}
