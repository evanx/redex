
import bunyan from 'bunyan';
import path from 'path';

function createLoggers() {

   function logging() {

   }

   const service = {
      create(name, level) {
         name = path.basename(name, '.js');
         level = level || process.env.loggerLevel;
         return bunyan.createLogger({name, level});
      }
   };

   return service;
};

module.exports = createLoggers();
