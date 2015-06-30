

testName=serviceRegistry

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
}

c0clear() {
  for key in `redis-cli keys 'redex:test:*'`
  do
    echo "redis-cli del '$key'"
    redis-cli del "$key"
  done
}

ns='redex:test:service:http'

c0redis() {
  echo "redis-cli scard $ns:ids" `redis-cli scard $ns:ids`
  echo "redis-cli keys $ns:*" `redis-cli keys '$ns:*'`
  echo "redis-cli smembers $ns:ids" `redis-cli smembers $ns:ids`
  echo "redis-cli hgetall $ns:$id" `redis-cli hgetall "$ns:$id"`
}

c1remove() {
  id="$1"
  echo "redis-cli srem $ns:ids $id" `redis-cli srem $ns:ids "$id"`
  c0redis
}

c1push() {
  id=$1
  echo "redis-cli lpush $ns:q '$id'" `redis-cli lpush $ns:q "$id"`
  sleep 1
}

c1client() {
  id=$1
  c1push $id
  c0redis
  sleep 4
  c1remove $id
}

c0client() {
  c1client 123
  sleep 4
  c1client 124
}

c0server() {
  nodejs index.js test/cases/serviceRegistry/registrants.yaml | bunyan -o short
}

c0default() {
  c0assert
  c0clear
  c0client & c0server
}

c0cancel() {
  nodejs index.js test/cases/serviceRegistry/registrants.yaml cancel | bunyan -o short
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
