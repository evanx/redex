
echo "Checking that nodejs and bunyan are installed..."

which 'nodejs' || exit 1

if ! which 'bunyan' 
then
  echo "Please install: npm install -g bunyan"
  exit 1
fi

echo "nodejs ~/redex/index.js http | bunyan -o short"

(sleep 2; echo "$0: Should be serving files by now on port 8880 from pwd:" `pwd`) & 

nodejs ~/redex/index.js http | bunyan -o short

