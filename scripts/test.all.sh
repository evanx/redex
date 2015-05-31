

for test in redisPromised redisDispatcher fileImporter redisImporter 
do 
  out=tmp/test.${test}.out
  echo; echo -n "$test: "
  sh scripts/test.${test}.sh | sed -e 1b -e '$!d' | tee $out
  tail -1 $out | grep -q OK$ || echo "$test: FAILED"
done

