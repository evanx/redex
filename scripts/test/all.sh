
cd ~/redixrouter

c0clear() {
  for key in `redis-cli keys 'redix:test:*'`
  do
    echo "redis-cli del '$key'"
    redis-cli del "$key"
  done
}

c0clear
ls -l scripts/test/auto/*.sh
for script in `ls scripts/test/auto/*.sh`
do 
  name=`basename $script .sh` 
  out=tmp/test.${name}.out
  echo; echo -n "$name: "
  sh ${script} | sed -e 1b -e '$!d' | tee $out
  tail -1 $out | grep -q OK$ || echo "$name: FAILED"
done

