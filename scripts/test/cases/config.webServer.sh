
set -u 

  if pwd | grep -qv '/redex$'
  then
    pwd
    echo "ERROR: not in 'redex' subdirectory"
    exit 1
  fi

  mkdir -p tmp

  testName=httpFileServer.default

  export configFile=config/configurator.${testName}.yaml

  if [ ! -f $configFile ]
  then
    echo "ERROR: invalid configFile $configFile"
    exit 1
  fi

  nodejs index.js cancel | bunyan -o short # warm

  export pidFile=tmp/redex.${testName}.pid
  export resultFile=tmp/redex.${testName}.result

  c0run() {
    rm -f $pidFile
    rm -f $resultFile
    nodejs index.js | bunyan -o short
    cat $resultFile
  }

  c0client() {
    sleep 5
    echo 'curl -s http://localhost:8880/README.md'
    if curl -s http://localhost:8880/README.md > tmp/curl.out
    then
      if head -1 tmp/curl.out | grep Redex 
      then
        result='OK'
      else
        result='response match failed'
      fi
    else
      result='curl failed'
    fi
    echo "$testName $0 $result" > $resultFile
    echo "rm $pidFile to shutdown Redex"
    rm -f $pidFile
  }

  c0client & c0run
