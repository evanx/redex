
cd ~/redixrouter || exit 1

  babel-node --stage 0 test/redisPromisedAsync.js | bunyan
