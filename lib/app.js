
export function getProcessor(processorName) {
   let processor = global.processors.get(processorName);
   if (!processor) {
      throw new Error('Missing processor: ' + processorName)
   }
   return processor;
}
