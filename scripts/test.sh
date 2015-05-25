
mkdir -p tmp/fileImporter/import
mkdir -p tmp/fileImporter/export

c0run() {
  baseDir=tests/httpRequest nodejs index.js | bunyan
}

c0client() {
  sleep 2
  echo '
    method: GET
    url: http://data.iol.io/s/sport
  ' > tmp/fileImporter/import/11.yaml
  sleep 2
  touch tmp/fileImporter/import/11.yaml
  ls -l tmp/fileImporter/import/11.yaml
}

c0client & c0run

