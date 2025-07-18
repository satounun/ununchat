const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require("socket.io");
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'https://ununchat.herokuapp.com'],
    methods: ['GET', 'POST'],
  },
});

const db = new sqlite3.Database('./chat.db');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT,
      message TEXT,
      time TEXT
    )
  `);
});

const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

console.log('Public folder:', publicPath);
console.log('Index file exists:', fs.existsSync(path.join(publicPath, 'index.html')));

app.get('/', (req, res) => {
  res.sendFile('index.html', { root: publicPath });
});

io.on('connection', socket => {
  db.all("SELECT username, message, time FROM messages ORDER BY id ASC", (err, rows) => {
    if (err) {
      console.error('DB読み込みエラー:', err);
      return;
    }
    rows.forEach(row => socket.emit('chat message', row));
  });

  socket.on('chat message', msg => {
    const { username, message, time } = msg;
    db.run(
      `INSERT INTO messages (username, message, time) VALUES (?, ?, ?)`,
      [username, message, time],
      function(err) {
        if (err) {
          console.error('DB書き込みエラー:', err);
          return;
        }
        io.emit('chat message', { id: this.lastID, username, message, time });
      }
    );
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
