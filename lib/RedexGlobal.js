

var path = require('path');

const that = {
   sourceDir: path.dirname(__dirname),

   require(path) {
      path = that.sourceDir + '/' + path;
      return require(path);
   }
}

global.RedexGlobal = that;
