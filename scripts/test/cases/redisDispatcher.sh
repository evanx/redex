
set -u

pwd | grep -q '/redex$' || exit 1

testName=redisDispatcher

export baseDir=test/cases/${testName}
export pidFile=tmp/redex.${testName}.pid
export clientFile=tmp/redex.${testName}.client

c0run() {
  rm -f $pidFile
  rm -f $clientFile
  echo "$testName baseDir $baseDir"
  nodejs index.js | bunyan -o short
  cat $clientFile
}

c0clear() {
  for key in `redis-cli keys 'redex:test:*'`
  do
    echo "redis-cli del $key"
    redis-cli del $key
  done
}

c0client() {
  c0clear
  sleep 6
  message='a test message'
  echo 'redis-cli llen redex:test:dispatcher:out'
  redis-cli llen redex:test:dispatcher:out
  echo "redis-cli lpush redex:test:dispatcher:in '$message'"
  redis-cli lpush redex:test:dispatcher:in "$message"
  sleep 1
  echo 'redis-cli llen redex:test:dispatcher:out'
  redis-cli llen redex:test:dispatcher:out
  echo 'redis-cli llen redex:test:dispatcher:pending'
  redis-cli llen redex:test:dispatcher:pending
  echo 'redis-cli llen redex:test:dispatcher:reply'
  redis-cli llen redex:test:dispatcher:reply
  echo 'redis-cli lrange redex:test:dispatcher:out 0 -1'
  redis-cli lrange redex:test:dispatcher:out 0 -1 | grep "$message" && echo "$testName: $0 OK" > $clientFile
  echo "rm $pidFile to shutdown Redex"
  rm -f $pidFile
}

c0client & c0run
