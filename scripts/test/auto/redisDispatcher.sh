
cd ~/redex || exit 1

testName=redisDispatcher

export baseDir=test/cases/${testName}
export pidFile=tmp/redex.${testName}.pid

c0run() {
  nodejs index.js | bunyan -o short
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
  sleep 2
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
  redis-cli lrange redex:test:dispatcher:out 0 -1 | grep "$message" && echo "$testName: OK"
  rm -f $pidFile
}

c0client & c0run
