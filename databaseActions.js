const r = require('rethinkdb');
const config = require('./config.json');
let conn;

r.connect(config.rethinkdb)
    .then(connection => {
        console.log('Truncate RethinkDB table positions...');
        r.table("positions").delete().run(connection)
    })
.finally(() => process.exit(0));
