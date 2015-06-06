
cd ~/redixrouter || exit 1

testName=redisDispatcher

export configDir=test/${testName}/config
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
  message='a test message'
  echo 'redis-cli llen redix:test:dispatcher:out'
  redis-cli llen redix:test:dispatcher:out
  echo "redis-cli lpush redix:test:dispatcher:in '$message'"
  redis-cli lpush redix:test:dispatcher:in "$message"
  sleep 1
  echo 'redis-cli llen redix:test:dispatcher:out'
  redis-cli llen redix:test:dispatcher:out
  echo 'redis-cli llen redix:test:dispatcher:pending'
  redis-cli llen redix:test:dispatcher:pending
  echo 'redis-cli llen redix:test:dispatcher:reply'
  redis-cli llen redix:test:dispatcher:reply
  echo 'redis-cli lrange redix:test:dispatcher:out 0 -1'
  redis-cli lrange redix:test:dispatcher:out 0 -1 | grep "$message" && echo "$testName: OK"
  rm -f $pidFile
}

c0client & c0run
