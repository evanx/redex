
mkdir -p ~/tmp/redexweb

cp favicon.ico ~/tmp/redexweb/. 2>/dev/null

cd ~/tmp/redexweb || exit 1

cp ~/redex/favicon.ico . 2>/dev/null
echo 'test me' > test.txt
echo 'test me' > README.md

testName=cli.http.simple

export pidFile=redex.${testName}.pid

c0rm() {
  rm -f $pidFile
}

c0client() {
  sleep 2
  if curl -s http://localhost:8880/test.txt > curl.txt
  then
    if cat curl.txt | grep 'test me'
    then
      echo "${testName} OK"
    else
      echo 'FAILED'
    fi
  else
    echo "exit code: $?"
  fi
  c0rm
}

c0server() {
  c0rm
  nodejs index.js http | bunyan -o short
}

c0client & c0server
