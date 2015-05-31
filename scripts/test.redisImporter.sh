
testName=redisImporter

export configDir=test/config/httpRequest 
export pidFile=tmp/redix.${testName}.pid

c0run() {
  nodejs index.js | bunyan -o short
}

c0clear() {
  for key in `redis-cli keys 'redix:test:*'`
  do
    echo "redis-cli del $key"
    redis-cli del $key
  done
}

c0client() {
  c0clear
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
  echo 'redis-cli lrange redix:test:http:out 0 -1'
  redis-cli lrange redix:test:http:out 0 -1 | python -mjson.tool | (grep 'Valleywag' && echo "$testName: OK")
  rm -f $pidFile
}

c0client & c0run
