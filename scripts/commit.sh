
if ! pwd | grep -q '/redex$'
then
  echo "Please run from redex directory"
  exit 1
fi

c1push() {
  pwd
  git pull
  git add --all 
  git commit -m "$message" 
  git push
  git status
}

c1commit() {
  message="$1"
  c1push $message
  cd util 
  c1push $message
  cd ..
  pwd
  c1push $message
}


if [ $# -gt 0 ]
then
  c1commit "$*"
else
  c1commit "scripts"
fi 
