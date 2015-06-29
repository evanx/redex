
pwd | grep -q '/redex$' || exit 1

  testName=webServer

  export baseDir=test/cases/${testName}
  export pidFile=tmp/redex.${testName}.pid
  export clientFile=tmp/redex.${testName}.client

  c0run() {
    rm -f $pidFile
    rm -f $clientFile
    nodejs index.js | bunyan -o short
    cat $clientFile
  }

  c0client() {
    sleep 1
    curl -s http://localhost:8888/test.txt
    echo
    curl -s http://localhost:8888/private
    echo
    sleep 1
    curl -s http://localhost:8888/test.html
    echo
    sleep 4
    echo "curl -s localhost:8888/test.txt"
    curl -I -s localhost:8888/test.txt
    echo
    curl -s http://localhost:8888/test.txt && ( echo "$testName $0 OK" > $clientFile )
    sleep 1
    rm -f $pidFile
  }

  c0client & c0run
