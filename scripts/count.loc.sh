
  echo; echo 'lines'
  grep '[a-z]' `find . | grep -v node_modules | grep -v '.git' | grep js$` | wc -l

  echo; echo 'semicolons'
  grep ';' `find . | grep -v node_modules | grep -v '.git' | grep js$` | wc -l
