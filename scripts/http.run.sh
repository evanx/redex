
echo "Checking that nodejs and bunyan are installed..."

which 'nodejs' || exit 1

if ! which 'bunyan' 
then
  echo "Please install: npm install -g bunyan"
fi

c0client() {
  sleep 3
  echo "above: nodejs ~/redex/index.js http | bunyan -o short"
  echo "curl -s localhost:8880"
  sleep 1
  curl -s "localhost:8880" | head -4
  echo "$0: Should be serving files by now on port 8880 from pwd:" `pwd`
}

echo "nodejs ~/redex/index.js http | bunyan -o short"
c0client & nodejs ~/redex/index.js http | ~/redex/node_modules/bunyan/bin/bunyan


