
  cd ~/redex || exit 1

  mkdir -p tmp 

  testName=httpFileServer.default

  export configFile=config/configurator.${testName}.yaml
  export pidFile=tmp/redex.${testName}.pid

  c0run() {
    nodejs index.js | bunyan -o short
  }

  c0client() {
    sleep 2
    echo 'curl -s http://localhost:8880/README.md'
    if curl -s http://localhost:8880/README.md > tmp/curl.out
    then
      if cat tmp/curl.out | head -1 | grep Redex 
      then 
        echo 'OK'
      else
        head -1 tmp/curl.out
        echo 'FAILED'
      fi
    else 
      head -1 tmp/curl.out
      echo 'FAILED'
    fi
    rm -f $pidFile
  }

  c0client & c0run
