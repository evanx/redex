
var pg = require('pg');

var conString = "postgres://redix:redix@localhost:5432/redix";

var client = new pg.Client(conString);

client.connect();

client.query("CREATE TEMP TABLE person (name VARCHAR(50), height integer, birthday date)");

client.query({
  name: 'insert person',
  text: "INSERT INTO person(name, height, birthday) values($1, $2, $3)",
  values: ['George', 70, new Date(1946, 2, 14)]
});

client.query({
  name: 'insert person',
  values: ['Paul', 63, new Date(1945, 4, 03)]
});

var query = client.query("SELECT * FROM person WHERE name = $1", ['Paul']);

query.on('row', function(row) {
  console.log(row);
  console.log("name: %s", row.name); //Beatle name: John
  console.log("birth year: %d", row.birthday.getYear()); //dates are returned as javascript dates
  console.log("height: %d' %d\"", Math.floor(row.height/12), row.height%12); //integers are returned as javascript ints
});

query.on('end', function() { 
  client.end();
});










