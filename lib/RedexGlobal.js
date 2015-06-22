

var path = require('path');
var bunyan = require('bunyan');

const that = {
   loggerLevel: process.env.loggerLevel || 'debug',
   sourceDir: path.dirname(__dirname),

   require(path) {
      path = that.sourceDir + '/' + path;
      return require(path);
   },

   logger(name) {
      let options = {
         name: name,
         loggerLevel: that.loggerLevel
      };
      return bunyan.createLogger(options);
   }
}

global.RedexGlobal = that;

module.exports = that;
