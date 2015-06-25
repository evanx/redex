
c1client() {
  sleep $1
  echo "Try http://localhost:8880"
}

  c1client 2 & c1client 4 & nodejs index.js test/cases/expressRouter/expressRouter.yaml | bunyan -o short

