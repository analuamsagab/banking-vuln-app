import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
export const ROOT = path.resolve(path.dirname(__filename), '..');

// Semua data runtime (DB, uploads, logs) bisa dipisahkan dari source code.
// Di Docker, DATA_DIR diarahkan ke volume /app/data.
export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(ROOT, process.env.DATA_DIR)
  : ROOT;

export const PORT = Number(process.env.PORT || 3001);
export const HOST = process.env.LAB_HOST || '127.0.0.1';
export const LAB_PROFILE = String(process.env.LAB_PROFILE || 'web').toLowerCase();
export const IS_EXTREME = LAB_PROFILE === 'extreme';

export const JWT_SECRET = process.env.JWT_SECRET || 'labsecret';
export const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'internal-lab-key-123';
export const SMTP_PASSWORD = process.env.SMTP_PASSWORD || 'smtp-lab-password';

export const DB_PATH = process.env.DB_PATH
  ? path.resolve(ROOT, process.env.DB_PATH)
  : path.join(DATA_DIR, 'database.sqlite');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
export const LOG_DIR = path.join(DATA_DIR, 'logs');
export const LOG_FILE = path.join(LOG_DIR, 'app.log');
export const LEGACY_LOG_FILE = path.join(ROOT, 'server-output.log');
export const EVIDENCE_DIR = path.join(ROOT, 'lab', 'evidence');
export const DIST_DIR = path.join(ROOT, 'dist');

export const RETENTION_DAYS = Number(process.env.LAB_EVIDENCE_RETENTION_DAYS || 30);
export const RACE_DELAY_MS = Number(process.env.LAB_RACE_DELAY_MS || 150);

export const PUBLIC_CONFIG = {
  lab_profile: LAB_PROFILE,
  node_env: process.env.NODE_ENV || 'development',
  jwt_secret: JWT_SECRET,
  internal_api_key: INTERNAL_API_KEY,
  smtp_password: SMTP_PASSWORD,
  db_path: DB_PATH,
  data_dir: DATA_DIR,
  upload_dir: UPLOAD_DIR,
};

export function ensureRuntimeDirs() {
  for (const dir of [DATA_DIR, UPLOAD_DIR, LOG_DIR, EVIDENCE_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
