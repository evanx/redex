
//console.log(module.filename);

import path from 'path';
import bunyan from 'bunyan';

const that = {
   loggerLevel: process.env.loggerLevel || 'debug',
   sourceDir: path.dirname(__dirname),

   require(path) {
      path = that.sourceDir + '/' + path;
      return require(path);
   },

   logger(name, level) {
      return Loggers.create(name, level);
   }
}

module.exports = that;
