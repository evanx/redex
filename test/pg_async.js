
let pg = require('pg-then');
let pgUrl = "postgres://redex:redex@localhost:5432/redex";
let client = pg.Client(pgUrl);

function printRow(row) {
  console.log(row);
  console.log("name: %s", row.name); //Beatle name: John
  console.log("birth year: %d", row.birthday.getYear()); //dates are returned as javascript dates
  console.log("height: %d' %d\"", Math.floor(row.height/12), row.height%12); //integers are returned as javascript ints
}

async function run() {
  await client.query("CREATE TEMP TABLE person (name VARCHAR(50), height integer, birthday date)");
  await client.query({
    name: 'insert person',
    text: "INSERT INTO person(name, height, birthday) values($1, $2, $3)",
    values: ['George', 70, new Date(1946, 2, 14)]
  });
  await client.query({
    name: 'insert person',
    values: ['Paul', 63, new Date(1945, 4, 3)]
  });
  let result = await client.query("SELECT * FROM person");
  console.log('result', result.rowCount);
  result.rows.forEach(printRow);
}

run();

