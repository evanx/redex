
import assert from 'assert';

export default function createConfigs(config, redixConfig) {
   const names = {
      importer: "importer.httpImporter.singleton",
      translator: "translator.expressFile.singleton",
      fileServer: "server.fileServer.singleton"
   };
   return [
      {
         processorName: names.importer,
         description: "Express webserver to import HTTP requests",
         port: config.port || 8880,
         timeout: config.timeout || 2000,
         route: [ names.translator, names.fileServer ]
      },
      {
         processorName: names.translator,
         description: "Translate ExpressJS 'http' message to 'file' message"
      },
      {
         processorName: names.fileServer,
         description: "Serve files for a webserver",
         root: config.root || '.',
         index: config.index || 'index.html'
      }
   ];
}
