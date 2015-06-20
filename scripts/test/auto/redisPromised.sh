
cd ~/redexrouter || exit 1

  babel-node test/redisPromised.js | bunyan -o short

