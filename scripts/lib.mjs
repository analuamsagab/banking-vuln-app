import fs from 'fs';
import net from 'net';
import path from 'path';
import { execSync } from 'child_process';
import sqlite3 from 'sqlite3';
import { EVIDENCE_DIR, RETENTION_DAYS } from '../server/config.js';

export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export function isPortInUse(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' });
    const done = (value) => {
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(500);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

export async function waitForPort(port, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isPortInUse(port)) return true;
    await delay(250);
  }
  return false;
}

export function stopPort(port) {
  const pids = new Set();

  try {
    if (process.platform === 'win32') {
      const output = execSync('netstat -ano -p tcp', { encoding: 'utf8' });
      for (const line of output.split(/\r?\n/)) {
        const parts = line.trim().split(/\s+/);
        const localAddress = parts[1] || '';
        const pid = parts[parts.length - 1];
        if (
          line.includes('LISTENING') &&
          new RegExp(`:${port}$`).test(localAddress) &&
          pid &&
          pid !== '0'
        ) pids.add(pid);
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        } catch {
          // proses mungkin sudah berhenti
        }
      }
    } else {
      const output = execSync(`lsof -ti tcp:${port}`, { encoding: 'utf8' });
      for (const pid of output.split(/\s+/).filter(Boolean)) {
        pids.add(pid);
        try {
          process.kill(Number(pid), 'SIGKILL');
        } catch {
          // proses mungkin sudah berhenti
        }
      }
    }
  } catch {
    // port tidak dipakai atau tool tidak tersedia
  }

  return [...pids];
}

export function emptyDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  for (const entry of fs.readdirSync(dir)) {
    fs.rmSync(path.join(dir, entry), { recursive: true, force: true });
  }
}

export function copyIfExists(source, destination) {
  if (!fs.existsSync(source)) return false;
  fs.cpSync(source, destination, { recursive: true, force: true });
  return true;
}

export function pruneEvidence(keepPath = null) {
  if (!fs.existsSync(EVIDENCE_DIR)) return [];
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const removed = [];

  for (const entry of fs.readdirSync(EVIDENCE_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const fullPath = path.join(EVIDENCE_DIR, entry.name);
    if (keepPath && path.resolve(fullPath) === path.resolve(keepPath)) continue;
    const stat = fs.statSync(fullPath);
    if (stat.mtimeMs < cutoff) {
      fs.rmSync(fullPath, { recursive: true, force: true });
      removed.push(entry.name);
    }
  }

  return removed;
}

export function getCounts(dbPath) {
  return new Promise((resolve) => {
    if (!fs.existsSync(dbPath)) return resolve({});
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);
    const counts = {};
    const tables = ['users', 'notes', 'transfers', 'tickets', 'statements', 'files', 'sessions'];
    let pending = tables.length;

    const finish = () => {
      db.close();
      resolve(counts);
    };

    for (const table of tables) {
      db.get(`SELECT COUNT(*) AS count FROM ${table}`, (error, row) => {
        counts[table] = error ? null : row.count;
        pending -= 1;
        if (pending === 0) finish();
      });
    }
  });
}

export function tail(file, lines = 25) {
  if (!fs.existsSync(file)) return '';
  const content = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  return content.slice(-lines).join('\n');
}
