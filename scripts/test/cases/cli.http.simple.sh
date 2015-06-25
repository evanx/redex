
pwd | grep -q '/redex$' || exit 1

testName=cli.http.simple

export pidFile=redex.${testName}.pid

c0rm() {
  rm -f $pidFile
}

c0client() {
  sleep 2
  if curl -s http://localhost:8880/README.md > curl.txt
  then
    if head -2 curl.txt | grep 'Redex'
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
