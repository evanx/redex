
import assert from 'assert';

export default function createConfigs(config, redixConfig) {
   const names = {
      importer: "importer.httpImporter.singleton",
      markdownRenderer: "http.renderer.markdown.singleton",
      httpTranslator: "translator.expressFile.singleton",
      fileServer: "server.fileServer.singleton"
   };
   return [
      {
         processorName: names.importer,
         description: "Express web server to import HTTP requests",
         port: config.port || 8880,
         timeout: config.timeout || 2000,
         route: [ names.markdownRenderer, names.httpTranslator, names.fileServer ]
      },
      {
         processorName: names.markdownRenderer,
         description: "Translate markdown in 'http' message content"
      },
      {
         processorName: names.httpTranslator,
         description: "Translate ExpressJS 'http' message to 'file' message"
      },
      {
         processorName: names.fileServer,
         description: "Serve files for a web server",
         root: config.root || '.',
         index: config.index || 'README.md'
      }
   ];
}
