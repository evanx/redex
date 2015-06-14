
mkdir -p tmp/fileImporter/import
mkdir -p tmp/fileImporter/export

baseDir=test/case/httpRequest nodejs index.js | bunyan

