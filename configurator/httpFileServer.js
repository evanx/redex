
import assert from 'assert';

// a configurator is for a given pattern, e.g. simple static web server
// a configurator takes a wholistic config for that pattern e.g. port and document root,
// and generates an array of processor configs e.g. HTTP server (with the specified port),
// and its file server (with the specified document root)

export default function createConfigs(config, redexConfig) {
   const names = {
      importer: 'http.importer.expressImporter.singleton',
      redexState: 'redex.state.singleton',
      router: 'http.router.urlRegex.singleton',
      markdownRenderer: 'http.renderer.markdown.singleton',
      httpTranslator: 'http.translator.file.singleton',
      fileServer: 'server.fileServer.singleton'
   };
   return [
      {
         processorName: names.importer,
         description: 'Express web server to import HTTP requests for the file server',
         port: config.port || 8880,
         timeout: config.timeout || 2000, // millis
         route: [ names.router ]
      },
      {
         processorName: names.router,
         description: 'Router for requests',
         rules: [
            {
               description: 'Redex state',
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
         description: 'Serve files for a web server',
         root: config.root || '.', // default document root of '.' will be process.cwd()
         index: config.index || 'README.md' // especially in case in ~/redex
      }
   ];
}
