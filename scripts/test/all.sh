
cd ~/redixrouter

mkdir -p tmp 

c0clear() {
  for key in `redis-cli keys 'redix:test:*'`
  do
    echo "redis-cli del '$key'"
    redis-cli del "$key"
  done
}

c0clear

  for script in cli.http.simple.sh
  do 
    echo; echo "$script: "
    sh scripts/test/auto/${script} 
    break
  done

  ls -l scripts/test/auto/*.sh
  for script in `ls scripts/test/auto/*.sh`
  do 
    name=`basename $script .sh` 
    out=tmp/test.${name}.out
    echo; echo -n "$name: "
    if sh ${script} > $out 
    then
      echo "exit ok: ${script}"
      if tail -1 $out | grep -q 'OK$'
      then
        cat $out | sed -e 1b -e '$!d' 
      else 
        echo "$name: FAILED"
      fi
    else
      cat $out
      break
    fi
  done

