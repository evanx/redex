
import assert from 'assert';

const importer = "importer.httpImporter.singleton";
const translator = "translator.expressFile.singleton";
const fileServer = "server.fileServer.singleton";

export default function createConfigs(config, redixConfig) {
   const port = config.port || 8880;
   const root = config.root || '.';
   const index = config.index || 'index.html';
   const timeout = config.timeout || 2000;
   return Object.assign({port, root, index, timeout}, {
      processors: [
         Object.assign({port, timeout}, {
            processorName: importer,
            description: "Express webserver to import HTTP requests",
            route: [ translator, fileServer ]
         }),
         {
            processorName: translator,
            description: "Translate ExpressJS 'http' message to 'file' message"
         },
         Object.assign({root, index}, {
            processorName: fileServer,
            description: "Serve files for a webserver"
         }
      ]
   };
}
