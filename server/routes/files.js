import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import multer from 'multer';
import { UPLOAD_DIR } from '../config.js';
import { dbAll, dbGet, dbRun } from '../db.js';
import { log } from '../logger.js';
import { asyncHandler } from '../utils.js';

const router = Router();

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  // path.basename mencegah upload menulis keluar folder uploads.
  // Path traversal read tetap tersedia di endpoint download.
  filename: (_req, file, cb) => cb(null, path.basename(file.originalname)),
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post(
  '/upload',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'File wajib diupload' });

    const userId = req.body?.user_id || req.user?.id || 1;
    const result = await dbRun(
      'INSERT INTO files (user_id, original_name, stored_name, mime, path) VALUES (?, ?, ?, ?, ?)',
      [
        userId,
        req.file.originalname,
        path.basename(req.file.originalname),
        req.file.mimetype,
        req.file.path,
      ]
    );

    log('INFO', 'file uploaded', {
      userId,
      original: req.file.originalname,
      stored: req.file.filename,
      mime: req.file.mimetype,
      size: req.file.size,
    });

    res.json({
      success: true,
      id: result.lastID,
      file: {
        original_name: req.file.originalname,
        stored_name: req.file.filename,
        mime: req.file.mimetype,
        url: `/uploads/${req.file.filename}`,
      },
    });
  })
);

router.get(
  '/files',
  asyncHandler(async (_req, res) => {
    const files = await dbAll(
      `SELECT files.*, users.username FROM files
       LEFT JOIN users ON users.id = files.user_id ORDER BY files.id DESC`
    );
    res.json({ success: true, files });
  })
);

router.get(
  '/files/download',
  asyncHandler(async (req, res) => {
    const name = String(req.query.name || '');
    if (!name) return res.status(400).json({ success: false, message: 'Parameter name wajib diisi' });

    // Path traversal read-only. Contoh: ?name=../database.sqlite
    const target = path.join(UPLOAD_DIR, name);
    try {
      const data = fs.readFileSync(target);
      log('WARN', 'file download', { name, target, size: data.length });
      res.type(path.extname(target));
      res.send(data);
    } catch (error) {
      res.status(404).json({ success: false, message: 'File tidak ditemukan', error: error.message });
    }
  })
);

router.get(
  '/files/:id',
  asyncHandler(async (req, res) => {
    const query = `SELECT files.*, users.username FROM files
      LEFT JOIN users ON users.id = files.user_id WHERE files.id = ${req.params.id}`;
    try {
      const file = await dbGet(query);
      if (!file) return res.status(404).json({ success: false, message: 'File tidak ditemukan' });
      res.json({ success: true, file, query });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error', error: error.message, query });
    }
  })
);

export default router;
