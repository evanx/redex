
echo "Checking that nodejs and bunyan are installed..."

which 'nodejs' || exit 1

if ! which 'bunyan' 
then
  echo "Please install: npm install -g bunyan"
  exit 1
fi

echo "nodejs ~/redixrouter/index.js http | bunyan -o short"

nodejs ~/redixrouter/index.js http | bunyan -o short

