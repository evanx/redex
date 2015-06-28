
pwd | grep -q '/redex$' || exit 1

mkdir -p tmp

testName=cli.http.simple

export pidFile=redex.${testName}.pid

c0rm() {
  rm -f $pidFile
}

c0client() {
  nodejs index.js none | bunyan -o short # warmup
  sleep 4
  if curl -s http://localhost:8880/README.md > tmp/curl.txt
  then
    if head -2 tmp/curl.txt | grep 'Redex'
    then
      echo "$testName $0 OK"
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
