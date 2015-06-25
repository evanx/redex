
mkdir -p ~/tmp/redex

cp favicon.ico ~/tmp/redex/. 2>/dev/null

cd ~/tmp/redex || exit 1

testName=cli.http.simple

export pidFile=redex.${testName}.pid

c0rm() {
  rm -f $pidFile
}

c0client() {
  sleep 2
  cp ~/redex/favicon.ico .
  echo 'test me' > test.txt
  echo 'test me' > README.md
  if curl -s http://localhost:8880/test.txt > curl.txt
  then
    if cat curl.txt | grep 'test me'
    then
      echo "${testName} OK"
    else
      cat curl.txt
      echo; echo 'FAILED'
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
