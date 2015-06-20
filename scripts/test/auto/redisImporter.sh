
cd ~/redixrouter || exit 1

testName=redisImporter

mkdir -p tmp/fileImporter/watched
mkdir -p tmp/fileImporter/reply

export configDir=test/case/httpRequest/config
export pidFile=tmp/redix.${testName}.pid

c0run() {
  nodejs index.js | bunyan -o short
}

c0clear() {
  for key in `redis-cli keys 'redix:test:*'`
  do
    echo "redis-cli del '$key'"
    redis-cli del "$key"
  done
}

c0client() {
  c0clear
  sleep 2
  echo :
  message='{
    "method": "GET",
    "url": "https://hacker-news.firebaseio.com/v0/item/160705.json?print=pretty",
    "json": true
  }'
  echo 'redis-cli llen redix:test:redishttp:reply'
  redis-cli llen redix:test:redishttp:reply
  echo "redis-cli lpush redix:test:redishttp:in '$message'"
  redis-cli lpush redix:test:redishttp:in "$message"
  sleep 6
  echo 'redis-cli llen redix:test:redishttp:reply'
  redis-cli llen redix:test:redishttp:reply
  echo 'redis-cli lrange redix:test:redishttp:reply 0 -1'
  redis-cli lrange redix:test:redishttp:reply 0 -1 | python -mjson.tool | (grep 'Valleywag' && echo "$testName: OK")
  rm -f $pidFile
}

c0client & c0run
