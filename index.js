const http = require('http');
const fs = require('fs');
const express = require('express');
const socketIO = require('socket.io');
const r = require('rethinkdb');
const config = require('./config.json');

// Loading Express, HTTP, Socket.IO and RethinkDB
const db = Object.assign(config.rethinkdb, {
    db: 'timeline'
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
        r.table('messages')
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
            r.table('messages')
                .run(conn)
                .then(cursor => {
                    cursor.each((err, message) => {
                        client.emit('/messages', message);
                    });
                });
            // Listening the event from client and insert new messages
            client.on('/messages', (body) => {
                const {
                    name, message
                } = body;
                const data = {
                    name, message, date: new Date()
                };
                r.table('messages').insert(data).run(conn);
            });
        });

        server.listen(3000, () => console.log('Timeline Server!'));
    })
    .error(err => {
        console.log('Can\'t connect to RethinkDB');
        throw err;
    });
