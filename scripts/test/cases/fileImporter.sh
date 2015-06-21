
mkdir -p tmp/fileImporter/watched
mkdir -p tmp/fileImporter/reply

testName=fileImporter

export baseDir=test/cases/httpRequest
export pidFile=tmp/redex.$testName.pid

c0run() {
  nodejs index.js | bunyan -o short
}

c0client() {
  item=hn160705
  rm -f tmp/fileImporter/reply/${item}*
  sleep 2
  echo '
    method: GET
    url: https://hacker-news.firebaseio.com/v0/item/160705.json?print=pretty
    json: true
  ' > tmp/fileImporter/watched/$item.yaml
  sleep 8
  ls -l tmp/fileImporter/reply/${item}*
  echo "grep Valleywag tmp/fileImporter/reply/${item}*"
  grep Valleywag tmp/fileImporter/reply/${item}* && echo "$testName: OK"
  rm -f $pidFile
}

c0client & c0run
