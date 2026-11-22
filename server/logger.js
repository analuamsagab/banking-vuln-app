import fs from 'fs';
import path from 'path';
import {
  LOG_DIR,
  LOG_FILE,
  LEGACY_LOG_FILE,
  ensureRuntimeDirs,
} from './config.js';

ensureRuntimeDirs();

function formatMeta(meta) {
  if (!meta || typeof meta !== 'object') return '';
  // Sengaja tidak memakai JSON.stringify supaya newline/HTML dari input user
  // tetap masuk ke log. Ini bagian dari demo log injection / XSS di log viewer.
  return Object.entries(meta)
    .map(([key, value]) => `${key}=${value}`)
    .join(' ');
}

export function log(level, message, meta = {}) {
  const line = `[${new Date().toISOString()}] [${level}] ${message}${
    Object.keys(meta).length ? ' ' + formatMeta(meta) : ''
  }`;

  console.log(line);

  for (const file of [LOG_FILE, LEGACY_LOG_FILE]) {
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.appendFileSync(file, line + '\n');
    } catch (error) {
      console.error('Gagal menulis log:', file, error.message);
    }
  }
}

export function readLogs() {
  try {
    return fs.readFileSync(LOG_FILE, 'utf8');
  } catch {
    return '';
  }
}

export function logFilePath() {
  return LOG_FILE;
}

export { LOG_DIR };
