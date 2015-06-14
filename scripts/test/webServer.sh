
  cd ~/redixrouter || exit 1

  testName=webServer

  export baseDir=test/case/${testName}
  export pidFile=tmp/redix.${testName}.pid

  c0run() {
    nodejs index.js | bunyan -o short
  }

  c0client() {
    sleep 1
    echo "curl -I -s localhost:8888/test.txt"
    curl -s http://localhost:8888/test.txt || echo "curl error"
    curl -s http://localhost:8888/private
    echo
    sleep 1
    curl -s http://localhost:8888/test.html
    echo
    sleep 4
    echo "curl -s localhost:8888/test.txt"
    curl -I -s localhost:8888/test.txt
    curl -s http://localhost:8888/test.txt && (echo; echo "$testName OK")
    sleep 1
    rm -f $pidFile
  }

  c0client & c0run

