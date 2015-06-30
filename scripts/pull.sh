
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

  c0assert
  git pull 
  [ -d util/.git ] || git submodule init
  git submodule update
  cd util 
  git checkout master
  git pull

