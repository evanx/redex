
cd ~/redixrouter

c0clear() {
  for key in `redis-cli keys 'redix:test:*'`
  do
    echo "redis-cli del '$key'"
    redis-cli del "$key"
  done
}

c0clear
for test in redisDispatcher fileImporter redisImporter redisPromised redisPromisedAsync
do 
  out=tmp/test.${test}.out
  echo; echo -n "$test: "
  sh scripts/test/${test}.sh | sed -e 1b -e '$!d' | tee $out
  tail -1 $out | grep -q OK$ || echo "$test: FAILED"
done

