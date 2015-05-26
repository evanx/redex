
mkdir -p tmp/fileImporter/watched
mkdir -p tmp/fileImporter/reply

item=hn160705

c0run() {
  baseDir=tests/httpRequest nodejs index.js | bunyan -o short
}

c0client() {
  sleep 2
  echo '
    method: GET
    url: https://hacker-news.firebaseio.com/v0/item/160705.json?print=pretty
  ' > tmp/fileImporter/watched/$item.yaml
  sleep 2
  touch tmp/fileImporter/watched/$item.yaml
  ls -l tmp/fileImporter/watched/$item.yaml
}

c0client & c0run
