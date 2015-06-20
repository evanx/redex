
mkdir -p ~/tmp/redix

cd ~/tmp/redix || exit 1

testName=cli.http

export pidFile=redix.${testName}.pid

c0rm() {
  rm -f $pidFile
}

c0client() { 
  sleep 2
  echo 'test me' > test.txt 
  echo curl -s http://localhost:8880/test.txt
  curl -s http://localhost:8880/test.txt | grep 'test me' && echo "${testName} OK"
  c0rm
}

c0server() {
  c0rm
  nodejs ~/redixrouter/index.js http >/dev/null
}

c0client & c0server

