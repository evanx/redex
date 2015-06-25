

  c0client() {
    sleep 1
    curl -I -s http://localhost:8888/test.txt
    echo; echo 'curl -s http://localhost:8888/test.txt'
    curl -s http://localhost:8888/test.txt 
    sleep 1
    echo; echo 'curl -s http://localhost:8888/private'
    curl -s http://localhost:8888/private
    sleep 1
    echo; echo 'curl -s http://localhost:8888/test.html'
    curl -s http://localhost:8888/test.html
    echo; echo 'curl -s http://localhost:8888/index.html'
    curl -s http://localhost:8888/index.html
    echo
  }

  c0client 

