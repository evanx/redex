
pwd | grep -q '/redex$' || exit 1

testName=redisImporter

mkdir -p tmp/fileImporter/watched
mkdir -p tmp/fileImporter/reply

export configDir=test/cases/httpRequest/config
export pidFile=tmp/redex.${testName}.pid

url="https://hacker-news.firebaseio.com/v0/item/160705.json?print=pretty"
echo "url $url"

c0run() {
  nodejs index.js | bunyan -o short
}

c0clear() {
  for key in `redis-cli keys 'redex:test:*'`
  do
    echo "redis-cli del '$key'"
    redis-cli del "$key"
  done
}

c0client() {
  c0clear
  sleep 4
  echo :
  message="{
    \"method\": \"GET\",
    \"url\": \"${url}\",
    \"json\": true
  }"
  echo 'redis-cli llen redex:test:redishttp:reply'
  redis-cli llen redex:test:redishttp:reply
  echo "redis-cli lpush redex:test:redishttp:in '$message'"
  redis-cli lpush redex:test:redishttp:in "$message"
  sleep 6
  echo 'redis-cli llen redex:test:redishttp:reply'
  redis-cli llen redex:test:redishttp:reply
  echo 'redis-cli lrange redex:test:redishttp:reply 0 -1'
  redis-cli lrange redex:test:redishttp:reply 0 -1 | python -mjson.tool |
    (grep 'Valleywag' && echo "$testName: $0 OK")
  rm -f $pidFile
}

c0client & c0run
