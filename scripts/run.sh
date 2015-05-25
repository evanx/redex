
mkdir -p tmp/fileImporter/import
mkdir tmp/fileImporter/export

baseDir=tests/httpRequest nodejs index.js | bunyan

