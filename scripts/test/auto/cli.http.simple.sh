
mkdir -p ~/tmp/redex

cd ~/tmp/redex || exit 1

testName=cli.http.simple

export pidFile=redex.${testName}.pid

c0rm() {
  rm -f $pidFile
}

c0client() {
  sleep 2
  echo 'test me' > test.txt
  curl -s http://localhost:8880/test.txt | grep 'test me' && echo "${testName} OK"
  c0rm
}

c0server() {
  c0rm
  nodejs ~/redex/index.js http >/dev/null
}

c0client & c0server
