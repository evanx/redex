

var path = require('path');
var bunyan = require('bunyan');

const that = {
   loggerLevel: process.env.loggerLevel || 'debug',
   sourceDir: path.dirname(__dirname),

   require(path) {
      path = that.sourceDir + '/' + path;
      return require(path);
   },

   logger(name, level) {
      name = path.basename(name);
      let options = {
         name: name,
         level: level || that.loggerLevel
      };
      return bunyan.createLogger(options);
   }
}

global.RedexGlobal = that;

module.exports = that;
