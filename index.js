// サーバー側

const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'https://your-heroku-app.herokuapp.com'], // HerokuのアプリURLに置き換えてください
    methods: ['GET', 'POST'],
  },
});
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./chat_history.db');
const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    message TEXT,
    time TEXT
  )`);
});

app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

io.on('connection', (socket) => {
    // 過去のメッセージをDBから読み込み送信
    db.all("SELECT username, message, time FROM messages ORDER BY id ASC", (err, rows) => {
        if (err) {
        console.error(err);
        return;
        }
        rows.forEach(row => {
        socket.emit('chat message', row);
        });
    });

    socket.on('chat message', (msg) => {
        // msgは { username, message, time } のオブジェクトを送る想定にするよ
        console.log('message: ', msg);
        
        // DBに保存
        const stmt = db.prepare("INSERT INTO messages (username, message, time) VALUES (?, ?, ?)");
        stmt.run(msg.username, msg.message, msg.time);
        stmt.finalize();

        // みんなに送る
        io.emit('chat message', msg);
        });
});
