
echo "Checking that nodejs and bunyan are installed..."

which 'nodejs' || exit 1

if ! which 'bunyan'
then
  echo "Please install: npm install -g bunyan"
  exit 1
fi

if ! pwd | grep -q '/redex$'
then
  echo "Please run from redex directory"
  exit 1
fi

echo "nodejs index.js $@ | bunyan -o short"

  nodejs index.js $@ | bunyan -o short
