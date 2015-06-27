
c0assert() {
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
}

c1client() {
  sleep 2
  echo "Try http://localhost:8880"
}

c0server() {
  nodejs index.js test/cases/serviceRegistry/redex.yaml | bunyan -o short
}

  c0assert
  c1client 2 & c1client 4 & c0server

