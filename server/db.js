import sqlite3 from 'sqlite3';
import { DB_PATH, ensureRuntimeDirs } from './config.js';
import { seedDatabase } from './seed.js';

sqlite3.verbose();

let db = null;

export function getDb() {
  if (!db) {
    ensureRuntimeDirs();
    db = new sqlite3.Database(DB_PATH);
    db.run('PRAGMA journal_mode = WAL');
    db.run('PRAGMA foreign_keys = OFF');
  }
  return db;
}

export function dbRun(sql, params = []) {
  const database = getDb();
  return new Promise((resolve, reject) => {
    database.run(sql, params, function onRun(err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

export function dbGet(sql, params = []) {
  const database = getDb();
  return new Promise((resolve, reject) => {
    database.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

export function dbAll(sql, params = []) {
  const database = getDb();
  return new Promise((resolve, reject) => {
    database.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

export function dbExec(sql) {
  const database = getDb();
  return new Promise((resolve, reject) => {
    database.exec(sql, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

export function closeDb() {
  if (!db) return Promise.resolve();
  return new Promise((resolve, reject) => {
    db.close((err) => {
      db = null;
      if (err) return reject(err);
      resolve();
    });
  });
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password TEXT,
  nama_lengkap TEXT,
  email TEXT,
  role TEXT DEFAULT 'customer',
  saldo INTEGER DEFAULT 0,
  bio TEXT DEFAULT '',
  mfa_enabled INTEGER DEFAULT 0,
  reset_otp TEXT,
  reset_otp_expires INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT UNIQUE,
  user_id INTEGER,
  mfa_verified INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at INTEGER
);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  content TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transfers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_user INTEGER,
  to_user INTEGER,
  amount INTEGER,
  fee INTEGER DEFAULT 0,
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  amount INTEGER,
  status TEXT DEFAULT 'completed',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  bill_id TEXT,
  amount INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  subject TEXT,
  message TEXT,
  status TEXT DEFAULT 'open',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS statements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  filename TEXT,
  content TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  original_name TEXT,
  stored_name TEXT,
  mime TEXT,
  path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS coupons (
  code TEXT PRIMARY KEY,
  amount INTEGER,
  used_by INTEGER,
  used_at DATETIME
);
`;

async function ensureColumns(table, additions) {
  const columns = await dbAll(`PRAGMA table_info(${table})`);
  const names = new Set(columns.map((column) => column.name));

  for (const [name, type] of additions) {
    if (!names.has(name)) {
      await dbExec(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);
    }
  }
}

async function migrateLegacySchema() {
  // Database dari versi awal lab belum punya kolom-kolom ini.
  await ensureColumns('users', [
    ['email', 'TEXT'],
    ['role', "TEXT DEFAULT 'customer'"],
    ['bio', "TEXT DEFAULT ''"],
    ['mfa_enabled', 'INTEGER DEFAULT 0'],
    ['reset_otp', 'TEXT'],
    ['reset_otp_expires', 'INTEGER'],
    ['created_at', 'DATETIME'],
  ]);

  await ensureColumns('transfers', [
    ['fee', 'INTEGER DEFAULT 0'],
    ['note', "TEXT DEFAULT ''"],
  ]);

  await dbExec('UPDATE users SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL');
  await dbExec("UPDATE transfers SET fee = 0 WHERE fee IS NULL");
  await dbExec("UPDATE transfers SET note = '' WHERE note IS NULL");
}

export async function initDb() {
  ensureRuntimeDirs();
  getDb();
  await dbExec(SCHEMA);
  await migrateLegacySchema();
  await seedDatabase(getDb());
  return getDb();
}
