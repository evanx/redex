
if ! pwd | grep -q '/redex$'
then
  echo "Please run from redex directory"
  exit 1
fi

c1commit() {
  message="$1"
  cd util 
  pwd
  git pull
  git add --all 
  git commit -m "$message" 
  git push
  git status
  cd ..
  pwd
  git pull
  git add --all  
  git commit -m "$message" 
  git push
  git status
}


if [ $# -gt 0 ]
then
  c1commit "$*"
else
  c1commit "scripts"
fi 
