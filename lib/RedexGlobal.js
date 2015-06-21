

const redexDir = __dirname.replace(/\/lib$/, '');

//console.log('redexDir', redexDir);

global.requireRedex = function(path) {
   path = path.replace(/^\//, '');
   return require(redexDir + '/' + path);
}

Object.assign(global, { redexDir });
