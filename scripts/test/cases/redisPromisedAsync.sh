
pwd | grep -q '/redex$' || exit 1

  babel-node --stage 0 test/redisPromisedAsync.js | bunyan -o short
