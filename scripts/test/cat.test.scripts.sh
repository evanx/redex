
echo "begin: $0"

cd ~/redixrouter

if [ ! -d tmp ] 
then
  echo "Note that ~/redixrouter/tmp directory will be created by scripts/test/all.sh"
else
  echo "tmp dir exists :)"
fi

echo "nc -vz localhost 6379"
if ! nc -vz localhost 6379
then
  echo "WARNING: Redis not running on localhost port 6379, so tests will not work"
  exit 1
else 
  echo "Redis is running :)"
fi

echo "nc -vz localhost 8880"
if ! nc -vz localhost 8880
then
  echo "WARNING: Redix integration tests use port 8880 which is currently in use, so test will not work"
else 
  echo "Port 8880 is free :)"
fi

echo "Note that tests will delete and create Redis keys prefixed with 'redix:test:' on the local Redis instance (localhost:6379)"

echo "redis-cli keys 'redix:test:*'"
redis-cli keys 'redix:test:*'

echo "end: $0"
