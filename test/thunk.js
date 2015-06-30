
import fs from 'fs';

async function readFile(file) {
  return cb => {
    fs.readFile(file, cb);
  };
}

async function test() {
  return await readFile('README.md');
}

test().then(result => {
  console.log('done', result);
});

