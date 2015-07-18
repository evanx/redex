
  pwd | grep -q '/redex$' || exit 1

  ( babel-node --stage 0 test/redisPromised/redisPromisedAsync.js && echo "$0 OK" ) | bunyan -o short
