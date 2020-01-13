const http = require('http');
const fs = require('fs');
const express = require('express');
const socketIO = require('socket.io');
const r = require('rethinkdb');
const config = require('./config.json');

// Loading Express, HTTP, Socket.IO and RethinkDB
const db = Object.assign(config.rethinkdb, {
    db: 'deviceLocation'
});
const app = express();
const server = http.Server(app);
const io = socketIO(server);

// Connecting to RethinkDB server
r.connect(db)
    .then(conn => {
        // Index route which renders the index.html
        app.get('/', (req, res) => {
            fs.readFile(`${__dirname}/index.html`, (err, html) => {
                res.end(html || err);
            });
        });

        // The changefeed is provided by change() function
        // which emits broadcast of new messages for all clients
        r.table('positions')
            .changes()
            .run(conn)
            .then(cursor => {
                cursor.each((err, data) => {
                    const message = data.new_val;
                    io.sockets.emit('/messages', message);
                });
            });

        // Listing all messages when new user connects into socket.io
        io.sockets.on('connect', (client) => {
            r.table('positions')
                .run(conn)
                .then(cursor => {
                    cursor.each((err, message) => {
                        client.emit('/messages', message);
                    });
                });
            // Listening the event from client and insert new messages
            client.on('/messages', (body) => {
                const {
                    lat, lng
                } = body;
                const sessionID = client.id;
                const data = {
                   clientId: sessionID, lat, lng, date: new Date()
                };
                r.table('positions').insert(data).run(conn);
                console.log(data)
            });
            client.on('disconnect', function () {
                console.log("Delete from table "+  client.id);
                var data = {
                    clientId: client.id
                };
                io.sockets.emit('/disconnected', data);
                return r.table("positions").filter({"clientId": client.id}).delete().run(conn)
            });
        });
        server.listen(3000, () => console.log('Timeline Server!'));
    })
    .error(err => {
        console.log('Can\'t connect to RethinkDB');
        throw err;
    });
