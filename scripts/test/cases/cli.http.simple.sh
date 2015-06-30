
set -u 

pwd | grep -q '/redex$' || exit 1

testName=cli.http.simple
tmp=tmp/redex/$testName

mkdir -p $tmp

export pidFile=$tmp/pid
export clientFile=$tmp/client

c0server() {
  rm -f $pidFile
  rm -f $clientFile
  nodejs index.js http | bunyan -o short
  cat $clientFile
}

c0client() {
  sleep 4
  if curl -s http://localhost:8880/README.md > tmp/curl.txt
  then
    if head -2 tmp/curl.txt | grep 'Redex'
    then
      echo "$testName $0 OK" > $clientFile
    else
      echo 'response match failed' > $clientFile
    fi
  else
    echo "curl failed with exit code: $?" > $clientFile
  fi
  rm -f $pidFile
}

  c0client & c0server

