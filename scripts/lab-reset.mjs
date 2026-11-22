import fs from 'fs';
import path from 'path';
import { spawn, spawnSync, execSync } from 'child_process';
import {
  DB_PATH,
  EVIDENCE_DIR,
  HOST,
  LEGACY_LOG_FILE,
  LOG_DIR,
  PORT,
  RETENTION_DAYS,
  ROOT,
  UPLOAD_DIR,
} from '../server/config.js';
import { initDb, closeDb } from '../server/db.js';
import {
  copyIfExists,
  emptyDir,
  getCounts,
  pruneEvidence,
  stopPort,
  tail,
  timestamp,
  waitForPort,
} from './lib.mjs';

const args = new Set(process.argv.slice(2));

if (args.has('--help') || args.has('-h')) {
  console.log(`Lab reset — mengembalikan runtime ke kondisi awal.

Pemakaian:
  npm run lab:reset -- [opsi]

Opsi:
  --backup        Paksa backup evidence (default aktif)
  --no-backup     Lewati backup
  --no-prune      Jangan hapus evidence > 30 hari
  --start         Autostart server setelah reset (default)
  --no-start      Jangan jalankan server
  --foreground    Jalankan server di foreground
  --hard          git restore + git clean ke HEAD (butuh --yes/--force)
  --yes, --force  Konfirmasi reset --hard
`);
  process.exit(0);
}

const noBackup = args.has('--no-backup') && !args.has('--backup');
const noPrune = args.has('--no-prune');
const noStart = args.has('--no-start') && !args.has('--start');
const foreground = args.has('--foreground');
const hard = args.has('--hard');
const yes = args.has('--yes') || args.has('--force');

function gitCommit() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function backupRuntime() {
  const backupDir = path.join(EVIDENCE_DIR, timestamp());
  fs.mkdirSync(backupDir, { recursive: true });

  const copied = [];
  const targets = [
    [DB_PATH, path.join(backupDir, 'database.sqlite')],
    [`${DB_PATH}-wal`, path.join(backupDir, 'database.sqlite-wal')],
    [`${DB_PATH}-shm`, path.join(backupDir, 'database.sqlite-shm')],
    [LOG_DIR, path.join(backupDir, 'logs')],
    [UPLOAD_DIR, path.join(backupDir, 'uploads')],
    [LEGACY_LOG_FILE, path.join(backupDir, 'server-output.log')],
    [path.join(ROOT, 'exports'), path.join(backupDir, 'exports')],
    [path.join(ROOT, 'backups'), path.join(backupDir, 'backups')],
  ];

  for (const [source, destination] of targets) {
    if (copyIfExists(source, destination)) copied.push(path.basename(source));
  }

  const meta = {
    created_at: new Date().toISOString(),
    git_commit: gitCommit(),
    retention_days: RETENTION_DAYS,
    copied,
  };

  fs.writeFileSync(path.join(backupDir, 'meta.json'), JSON.stringify(meta, null, 2));
  return backupDir;
}

function hardReset() {
  if (!yes) {
    console.error(
      'Reset --hard akan mengembalikan source code ke git HEAD dan menghapus file untracked.\n' +
        'Jalankan ulang dengan --hard --yes jika benar-benar yakin.'
    );
    process.exit(1);
  }

  console.log('Hard reset: git restore + git clean...');
  execSync('git restore --source=HEAD --staged --worktree -- .', {
    cwd: ROOT,
    stdio: 'inherit',
  });
  execSync(
    'git clean -fd -e node_modules -e .env -e database.sqlite -e uploads -e logs -e lab/evidence',
    { cwd: ROOT, stdio: 'inherit' }
  );
}

function deleteRuntime() {
  for (const file of [DB_PATH, `${DB_PATH}-wal`, `${DB_PATH}-shm`, LEGACY_LOG_FILE]) {
    fs.rmSync(file, { force: true });
  }

  for (const dir of [
    UPLOAD_DIR,
    LOG_DIR,
    path.join(ROOT, 'exports'),
    path.join(ROOT, 'backups'),
    path.join(ROOT, 'tmp'),
  ]) {
    emptyDir(dir);
  }
}

function buildIfNeeded() {
  const indexFile = path.join(ROOT, 'dist', 'index.html');
  if (fs.existsSync(indexFile)) return;

  console.log('dist/index.html belum ada, menjalankan build frontend...');
  const result = spawnSync('npm', ['run', 'build'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
  });
  if (result.status !== 0) {
    console.error('Build frontend gagal.');
    process.exit(1);
  }
}

async function startServer() {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const logPath = path.join(LOG_DIR, 'server-start.log');
  const logFd = fs.openSync(logPath, 'a');

  if (foreground) {
    console.log(`Menjalankan server di foreground: http://${HOST}:${PORT}`);
    spawnSync(process.execPath, ['server.js'], {
      cwd: ROOT,
      stdio: 'inherit',
      env: process.env,
    });
    return;
  }

  const child = spawn(process.execPath, ['server.js'], {
    cwd: ROOT,
    detached: true,
    stdio: ['ignore', logFd, logFd],
    env: process.env,
  });
  child.unref();

  const ready = await waitForPort(PORT, 10000);
  if (!ready) {
    console.error(`Server gagal start dalam 10 detik. Cek log: ${logPath}`);
    console.error(tail(logPath, 30));
    process.exit(1);
  }

  console.log(`Server autostart: http://${HOST}:${PORT} (PID ${child.pid})`);
  console.log(`Log startup: ${logPath}`);
}

async function main() {
  console.log('=== Lab Reset ===');
  console.log(`Data dir: ${path.dirname(DB_PATH)}`);

  const stopped = [...stopPort(PORT), ...stopPort(5173)];
  if (stopped.length) {
    console.log(`Server dihentikan (PID: ${stopped.join(', ')}).`);
  } else {
    console.log('Tidak ada server yang berjalan di port 3001/5173.');
  }

  let backupDir = null;
  if (!noBackup) {
    const counts = await getCounts(DB_PATH);
    backupDir = backupRuntime();
    fs.writeFileSync(
      path.join(backupDir, 'counts.json'),
      JSON.stringify(counts, null, 2)
    );
    console.log(`Backup dibuat: ${backupDir}`);
  } else {
    console.log('Backup dilewati (--no-backup).');
  }

  if (!noPrune) {
    const removed = pruneEvidence(backupDir);
    console.log(
      removed.length
        ? `Evidence > ${RETENTION_DAYS} hari dihapus: ${removed.join(', ')}`
        : `Tidak ada evidence > ${RETENTION_DAYS} hari.`
    );
  }

  if (hard) hardReset();

  deleteRuntime();
  console.log('Runtime data dihapus.');

  await initDb();
  await closeDb();
  console.log('Schema dan seed awal dibuat ulang.');

  buildIfNeeded();

  if (noStart) {
    console.log('Server tidak dijalankan (--no-start).');
    console.log('Jalankan: npm run lab:start');
    return;
  }

  await startServer();
}

main().catch((error) => {
  console.error('Reset gagal:', error);
  process.exit(1);
});
