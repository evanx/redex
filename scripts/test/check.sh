
echo "begin: $0"

if ! pwd | grep -q '/redex$'
then
  echo "Please run from redex directory"
  exit 1
fi

if [ ! -d tmp ]
then
  echo "Note that redex/tmp directory will be created by scripts/test/all.sh"
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
  echo "WARNING: Redex integration tests use port 8880 which is currently in use, so test will not work"
else
  echo "Port 8880 is free :)"
fi

echo "Note that tests will delete and create Redis keys prefixed with 'redex:test:' on the local Redis instance (localhost:6379)"

echo "redis-cli keys 'redex:test:*'"
redis-cli keys 'redex:test:*'

if ! which nodejs
then
  echo "WARNING: nodejs not available"
fi

if ! which bunyan
then
  echo "Please install bunyan globally: npm install -g bunyan"
fi

echo "Further commands:"
echo "- npm install"
echo "- git submodule init"
echo "- git submodule update"
echo "- scripts/test/all.sh"
echo "- scripts/http.run.sh"
