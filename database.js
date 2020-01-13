const r = require('rethinkdb');
const config = require('./config.json');
let conn;

r.connect(config.rethinkdb)
    .then(connection => {
        console.log('Connecting RethinkDB...');
        conn = connection;
        //return r.dbDrop('deviceLocation').run(conn);
       return r.dbCreate('deviceLocation').run(conn);
    })
    .then(() => {
        console.log('Database "deviceLocation" created!');
        return r.db('deviceLocation').tableCreate('positions').run(conn);
    })
    .then(() => console.log('Table "positions" created!'))
    .error(err => console.log(err))
    .finally(() => process.exit(0));
