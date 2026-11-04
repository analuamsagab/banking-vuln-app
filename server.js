import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, 'database.sqlite');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(join(__dirname, 'dist')));

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    nama_lengkap TEXT,
    saldo INTEGER
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS transfers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user INTEGER,
    to_user INTEGER,
    amount INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
    if (!err && row.count === 0) {
      const stmt = db.prepare("INSERT INTO users (username, password, nama_lengkap, saldo) VALUES (?, ?, ?, ?)");
      stmt.run('budi', 'budi123', 'Budi Santoso', 5000000);
      stmt.run('andi', 'andi123', 'Andi Pratama', 2500000);
      stmt.run('admin', 'admin123', 'Administrator', 99999999);
      stmt.finalize();

      const noteStmt = db.prepare("INSERT INTO notes (user_id, content) VALUES (?, ?)");
      noteStmt.run(1, 'Penting: Jangan pernah bagikan password ke siapa pun!');
      noteStmt.run(2, 'Sudah kirim dana ke Budi sebesar Rp 500,000');
      noteStmt.finalize();

      console.log('Database seeded with users and notes.');
    }
  });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username dan password wajib diisi' });
  }

  const query = `SELECT id, username, nama_lengkap, saldo FROM users WHERE username = '${username}' AND password = '${password}'`;

  console.log('Query:', query);

  db.get(query, (err, row) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Kesalahan database',
        error: err.message,
        query: query
      });
    }

    if (row) {
      res.json({
        success: true,
        user: {
          id: row.id,
          username: row.username,
          namaLengkap: row.nama_lengkap,
          saldo: row.saldo
        }
      });
    } else {
      res.status(401).json({
        success: false,
        message: `User "${username}" tidak ditemukan atau password salah`
      });
    }
  });
});

app.get('/api/users/:id', (req, res) => {
  const id = req.params.id;

  const query = `SELECT id, username, nama_lengkap, saldo FROM users WHERE id = ${id}`;

  db.get(query, (err, row) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error', error: err.message });
    }
    if (row) {
      res.json({
        success: true,
        user: row
      });
    } else {
      res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }
  });
});

app.post('/api/notes', (req, res) => {
  const { user_id, content } = req.body;

  db.run(
    `INSERT INTO notes (user_id, content) VALUES (${user_id}, '${content}')`,
    function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error', error: err.message });
      }
      res.json({ success: true, id: this.lastID });
    }
  );
});

app.get('/api/notes', (req, res) => {
  db.all(`SELECT * FROM notes`, (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error', error: err.message });
    }
    res.json({ success: true, notes: rows });
  });
});

app.get('/api/transfer', (req, res) => {
  const { from_id, to_id, amount } = req.query;

  if (!from_id || !to_id || !amount) {
    return res.status(400).json({ success: false, message: 'Parameter from_id, to_id, amount wajib diisi' });
  }

  const insertQuery = `INSERT INTO transfers (from_user, to_user, amount) VALUES (${from_id}, ${to_id}, ${amount})`;

  db.run(insertQuery, function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: 'Transfer gagal', error: err.message });
    }

    res.json({
      success: true,
      message: `Transfer Rp ${Number(amount).toLocaleString()} dari user ${from_id} ke user ${to_id} berhasil`
    });
  });
});

app.get('/api/debug', (req, res) => {
  res.json({
    note: 'Semua data dikirim via HTTP plaintext! Gunakan Wireshark untuk melihat credentials.',
    tip: 'Login credentials terlihat jelas di network traffic.'
  });
});

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ success: false, message: 'Not found' });
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
