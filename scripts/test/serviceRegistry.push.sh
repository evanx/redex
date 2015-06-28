

c0client() {
  ns='redex:test:service:http'
  ttl=10
  id=`date +%s`
  echo "$ns $id"
  time=`redis-cli time | head -1`
  deadline=`echo "$time + $ttl" | bc`
  echo "time $time, ttl $ttl, deadline $deadline"
  message="{ id: $id, deadline: $deadline }"
  message=`echo "$message" | sed 's/ \(\w*\): / "\1": /g'`
  echo "message $message"
  echo "redis-cli lpush $ns:in '$message'"
  redis-cli lpush $ns:in "$message"
  sleep 1
  echo "redis-cli keys $ns:*"
  redis-cli keys '$ns:*'
  echo "redis-cli smembers $ns:ids"
  redis-cli smembers $ns:ids
  echo "redis-cli hgetall $ns:$id"
  redis-cli hgetall "$ns:$id"
  echo "message $message"
  sleep 6
  echo "redis-cli srem $ns:ids $id"
  redis-cli srem $ns:ids "$id"
  echo "redis-cli smembers $ns:ids"
  redis-cli smembers $ns:ids
}

  c0client 
