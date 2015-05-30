
mkdir -p tmp/fileImporter/watched
mkdir -p tmp/fileImporter/reply

c0run() {
  baseDir=tests/httpRequest nodejs index.js | bunyan -o short
}

c0fileImporter() {
  item=hn160705
  sleep 2
  echo '
    method: GET
    url: https://hacker-news.firebaseio.com/v0/item/160705.json?print=pretty
  ' > tmp/fileImporter/watched/$item.yaml
  sleep 2
  touch tmp/fileImporter/watched/$item.yaml
  ls -l tmp/fileImporter/watched/$item.yaml
}

c0redisImporter() {
  sleep 2
  echo :
  message='{
    "method": "GET",
    "url": "https://hacker-news.firebaseio.com/v0/item/160705.json?print=pretty"
  }'
  echo "redis-cli lpush redix:test:http:in '$message'"
  redis-cli lpush redix:test:http:in "$message"
}

c0client() {
  c0fileImporter
  #c0redisImporter
}

c0client & c0run
