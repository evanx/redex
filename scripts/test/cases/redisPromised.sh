
  pwd | grep -q '/redex$' || exit 1

  ( babel-node test/redisPromised/redisPromised.js && echo "$0 OK" ) | bunyan -o short
