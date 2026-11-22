import fs from 'fs';
import path from 'path';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import {
  DIST_DIR,
  HOST,
  LAB_PROFILE,
  LEGACY_LOG_FILE,
  LOG_FILE,
  PORT,
  UPLOAD_DIR,
  DB_PATH,
  ensureRuntimeDirs,
} from './config.js';
import { initDb } from './db.js';
import { attachUser } from './auth.js';
import { log } from './logger.js';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import transfersRoutes from './routes/transfers.js';
import notesRoutes from './routes/notes.js';
import supportRoutes from './routes/support.js';
import filesRoutes from './routes/files.js';
import integrationsRoutes from './routes/integrations.js';
import adminRoutes from './routes/admin.js';

ensureRuntimeDirs();

const app = express();

// Sengaja trust proxy: X-Forwarded-For/Host bisa dipakai untuk spoof IP/host.
app.set('trust proxy', true);

// CORS mencerminkan origin dan mengizinkan credentials.
app.use(cors({ origin: true, credentials: true }));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
// Body XML diterima apa adanya supaya XXE bisa didemokan.
app.use(express.text({ type: ['application/xml', 'text/xml'], limit: '2mb' }));
app.use(cookieParser());

// Middleware auth yang menerima cookie, JWT, atau header X-User-Id.
app.use(attachUser);

app.use(express.static(DIST_DIR));
app.use('/uploads', express.static(UPLOAD_DIR, { dotfiles: 'allow' }));

app.use('/api/auth', authRoutes);
app.use('/api', usersRoutes);
app.use('/api', transfersRoutes);
app.use('/api', notesRoutes);
app.use('/api', supportRoutes);
app.use('/api', filesRoutes);
app.use('/api', integrationsRoutes);
app.use('/api', adminRoutes);

app.get('/backup/database.sqlite', (_req, res) => {
  res.download(DB_PATH, 'database.sqlite');
});

app.get('/backup/app.log', (_req, res) => {
  res.download(LOG_FILE, 'app.log');
});

app.get('/backup/server-output.log', (_req, res) => {
  res.download(LEGACY_LOG_FILE, 'server-output.log');
});

app.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send(
    'User-agent: *\nDisallow: /admin\nDisallow: /backup\nDisallow: /api/internal\n'
  );
});

app.use('/api', (_req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint tidak ditemukan' });
});

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }

  const indexFile = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexFile)) {
    return res.sendFile(indexFile);
  }

  return res.status(503).send(
    '<h1>Frontend belum dibuild</h1><p>Jalankan <code>npm run build</code> lalu restart server.</p>'
  );
});

app.use((err, req, res, _next) => {
  log('ERROR', 'unhandled error', {
    path: req.path,
    method: req.method,
    error: err.message,
    stack: err.stack,
  });

  if (res.headersSent) return;

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    stack: err.stack,
    path: req.path,
    method: req.method,
  });
});

initDb()
  .then(() => {
    app.listen(PORT, HOST, () => {
      log('INFO', 'server started', {
        url: `http://${HOST}:${PORT}`,
        profile: LAB_PROFILE,
        db: DB_PATH,
      });

      if (HOST !== '127.0.0.1' && HOST !== 'localhost') {
        console.warn(
          'WARNING: server bind ke jaringan non-localhost. Jangan expose lab ini ke internet publik!'
        );
      }
    });
  })
  .catch((error) => {
    console.error('Gagal inisialisasi database:', error);
    process.exit(1);
  });

export default app;
