
echo "Checking that nodejs and bunyan are installed..."

which 'nodejs' || exit 1

if ! which 'bunyan'
then
  echo "Please install: npm install -g bunyan"
  exit 1
fi

echo "nodejs ~/redex/index.js $@ | bunyan -o short"

  nodejs ~/redex/index.js $@ | bunyan -o short

