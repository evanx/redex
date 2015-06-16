
import assert from 'assert';

const processorNames = {
   importer: "importer.httpImporter.singleton",
   translator: "translator.expressFile.singleton",
   fileServer: "server.fileServer.singleton"
};

export default function createConfigs(config, redixConfig) {
   const configuration = {
      port: config.port || 8880,
      root: config.root || '.',
      index: config.index || 'index.html',
      timeout: config.timeout || 2000
   };
   return Object.assign(configuration, {
      processors: [
         Object.assign({port, timeout}, {
            processorName: processorNames.importer,
            description: "Express webserver to import HTTP requests",
            route: [ processorNames.translator, processorNames.fileServer ]
         }),
         {
            processorName: processorNames.translator,
            description: "Translate ExpressJS 'http' message to 'file' message"
         },
         Object.assign({root, index}, {
            processorName: processorNames.fileServer,
            description: "Serve files for a webserver"
         }
      ]
   };
}
