
mkdir -p tmp/fileImporter/import
mkdir -p tmp/fileImporter/export

baseDir=test/httpRequest nodejs index.js | bunyan

