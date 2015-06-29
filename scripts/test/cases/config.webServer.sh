
  if pwd | grep -qv '/redex$' 
  then
    pwd
    echo "ERROR: not in 'redex' subdirectory"
    exit 1
  fi

  mkdir -p tmp

  testName=httpFileServer.default

  export configFile=config/configurator.${testName}.yaml
  export pidFile=tmp/redex.${testName}.pid

  if [ ! -f $configFile ] 
  then
    echo "ERROR: invalid configFile $configFile"
    exit 1
  fi

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
        echo "$testName $0 OK"
      else
        head -1 tmp/curl.out
        echo 'FAILED'
      fi
    else
      head -1 tmp/curl.out
      echo 'FAILED'
    fi
    echo "rm $pidFile to shutdown Redex"
    rm -f $pidFile
  }

  c0client & c0run
