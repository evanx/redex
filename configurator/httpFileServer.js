
import assert from 'assert';

export default function createConfigs(config, redixConfig) {
   const processorNames = {
      importer: "importer.httpImporter.singleton",
      translator: "translator.expressFile.singleton",
      fileServer: "server.fileServer.singleton"
   };
   return [
      {
         processorName: processorNames.importer,
         description: "Express webserver to import HTTP requests",
         port: config.port || 8880,
         timeout: config.timeout || 2000,
         route: [ processorNames.translator, processorNames.fileServer ]
      }),
      {
         processorName: processorNames.translator,
         description: "Translate ExpressJS 'http' message to 'file' message"
      },
      {
         processorName: processorNames.fileServer,
         description: "Serve files for a webserver",
         root: config.root || '.',
         index: config.index || 'index.html'
      }
   ];
}
