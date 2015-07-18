
testName=redisQuery

export pidFile=tmp/redex.${testName}.pid

c0assert() {
  which 'nodejs' || exit 1
  if ! which 'bunyan'
  then
    echo "Please install: npm install -g bunyan"
    exit 1
  fi
  if ! pwd | grep -q '/redex$'
  then
    echo "Please run from redex directory"
    exit 1
  fi
  if [ ! -d tmp ]
  then
    echo "Please create tmp/ directory"
    exit 1
  fi
}

c0clear() {
  for key in `redis-cli keys 'redex:test:*'`
  do
    echo "redis-cli del '$key'"
    redis-cli del "$key"
  done
}

ns='redex:test:query'

c0redis() {
  redis-cli keys "$ns:*"
}

c0client() {
  sleep 3
  curl -s -v -H 'Content-Type: application/json' -d '{"test": true}' http://localhost:8880/post
}

c0cancel() {
  nodejs index.js test/redisQuery/redex.yaml cancel | bunyan -o short
}

c0server() {
  nodejs index.js test/redisQuery/redex.yaml debug | bunyan -o short
}

c0default() {
  c0assert
  c0clear
  c0client & c0server
  c0redis
}

if [ $# -eq 1 ]
then
  command=$1
  shift
  echo "c$#$command $@"
  c$#$command $@
else
  c0default
fi
