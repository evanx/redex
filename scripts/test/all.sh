
cd ~/redixrouter

mkdir -p tmp

c0clear() {
  for key in `redis-cli keys 'redix:test:*'`
  do
    echo; echo "### redis-cli del '$key'"
    redis-cli del "$key"
  done
}

c0clear

  for script in cli.http.simple.sh
  do
    script="scripts/test/auto/$script"
    echo; echo "### warmup: $script"
    sh ${script}
    break
  done

  echo; echo "### ls -l scripts/test/auto/*.sh"
  ls -l scripts/test/auto/*.sh
  for script in `ls scripts/test/auto/*.sh`
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
        cat $out | sed -e 1b -e '$!d'
      else
        echo "$name: FAILED"
      fi
    else
      echo "error exit code: $exitCode"
      cat $out
      break
    fi
  done
