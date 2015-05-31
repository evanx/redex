
c0run() {
  baseDir=tests/httpRequest nodejs index.js | bunyan -o short
}

c0redisImporter() {
  sleep 2
  echo :
  message='{
    "method": "GET",
    "url": "https://hacker-news.firebaseio.com/v0/item/160705.json?print=pretty"
  }'
  echo 'redis-cli llen redix:test:http:out'
  redis-cli llen redix:test:http:out
  echo "redis-cli lpush redix:test:http:in '$message'"
  redis-cli lpush redix:test:http:in "$message"
  sleep 4
  echo 'redis-cli llen redix:test:http:out'
  redis-cli llen redix:test:http:out
  sleep 1
  echo 'redis-cli lrange redix:test:http:out 0 -1'
  redis-cli lrange redix:test:http:out 0 -1 | python -mjson.tool
}

c0client() {
  c0redisImporter
}

c0clear() {
   for key in `redis-cli keys 'redix:test:*'`
   do
     echo "redis-cli del $key"
     redis-cli del $key
   done
   sleep 1
}

c0clear
c0client & c0run
