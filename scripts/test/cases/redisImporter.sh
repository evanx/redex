
set -u

pwd | grep -q '/redex$' || exit 1

testName=redisImporter

mkdir -p tmp/fileImporter/watched
mkdir -p tmp/fileImporter/reply

export configDir=test/cases/httpRequest/config

url="https://hacker-news.firebaseio.com/v0/item/160705.json?print=pretty"
echo "url $url"

nodejs index.js cancel | bunyan -o short

export pidFile=tmp/redex.${testName}.pid
export clientFile=tmp/redex.${testName}.client

c0run() {
  rm -f $pidFile
  rm -f $clientFile
  echo "$testName configFir $configDir"
  nodejs index.js | bunyan -o short
  tail -1 $clientFile
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
  sleep 6
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
    ( grep 'Valleywag' && echo "$testName: $0 OK" > $clientFile )
  echo "rm $pidFile to shutdown Redex"
  rm -f $pidFile
}

  c0client & c0run
