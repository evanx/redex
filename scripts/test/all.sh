
if ! nc -vz localhost 6379 2>/dev/null
then
  echo "WARNING: Redis not running on localhost port 6379, so tests will not work"
  exit 1
fi

if nc -vz localhost 8880 2>/dev/null
then
  echo "WARNING: Redex integration tests use port 8880 which is currently in use, so test will not work"
  exit 1
fi

if ! pwd | grep -q '/redex$'
then
  echo "Please run from redex directory"
  exit 1
fi

mkdir -p tmp

c0clear() {
  for key in `redis-cli keys 'redex:test:*'`
  do
    echo; echo "### redis-cli del '$key'"
    redis-cli del "$key"
  done
}

c0clear

  node index.js none # warmup

  for script in cli.http.simple.sh
  do
    script="scripts/test/cases/$script"
    echo; echo "### warmup: $script"
    sh ${script}
    break
  done

  echo; echo "### ls -l scripts/test/cases/*.sh"
  ls -l scripts/test/cases/*.sh
  for script in `ls scripts/test/cases/*.sh`
  do
    name=`basename $script .sh`
    out=tmp/test.${name}.out
    echo; echo "### $script"
    sh ${script} > $out
    exitCode=$?
    if [ $exitCode -eq 0 ]
    then
      if tail -1 $out | grep -q 'OK$'
      then
        cat $out | sed -e 2b -e '$!d'
      else
        echo "$name: FAILED"
      fi
    else
      echo "error exit code: $exitCode"
      cat $out
      break
    fi
  done
