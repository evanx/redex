

var path = require('path');

const that = {
   loggerLevel: process.env.loggerLevel || 'debug',
   sourceDir: path.dirname(__dirname),

   require(path) {
      path = that.sourceDir + '/' + path;
      return require(path);
   }
}

global.RedexGlobal = that;
