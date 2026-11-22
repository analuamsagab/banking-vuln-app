import { Router } from 'express';
import { dbAll, dbGet, dbRun } from '../db.js';
import { log } from '../logger.js';
import { asyncHandler } from '../utils.js';

const router = Router();

router.get(
  '/notes',
  asyncHandler(async (_req, res) => {
    const notes = await dbAll(
      `SELECT notes.*, users.username
       FROM notes LEFT JOIN users ON users.id = notes.user_id
       ORDER BY notes.id DESC`
    );
    res.json({ success: true, notes });
  })
);

router.post(
  '/notes',
  asyncHandler(async (req, res) => {
    const { user_id, content } = req.body || {};
    if (!user_id || !content) {
      return res.status(400).json({ success: false, message: 'user_id dan content wajib diisi' });
    }

    // SQL Injection yang disengaja.
    const query = `INSERT INTO notes (user_id, content) VALUES (${user_id}, '${content}')`;
    try {
      const result = await dbRun(query);
      log('INFO', 'note created', { user_id, content, query });
      res.json({ success: true, id: result.lastID, query });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error', error: error.message, query });
    }
  })
);

router.get(
  '/notes/:id',
  asyncHandler(async (req, res) => {
    const query = `SELECT notes.*, users.username FROM notes
      LEFT JOIN users ON users.id = notes.user_id WHERE notes.id = ${req.params.id}`;
    try {
      const note = await dbGet(query);
      if (!note) return res.status(404).json({ success: false, message: 'Note tidak ditemukan' });
      res.json({ success: true, note, query });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error', error: error.message, query });
    }
  })
);

router.delete(
  '/notes/:id',
  asyncHandler(async (req, res) => {
    const query = `DELETE FROM notes WHERE id = ${req.params.id}`;
    try {
      const result = await dbRun(query);
      log('WARN', 'note deleted', { id: req.params.id, changes: result.changes });
      res.json({ success: true, changes: result.changes, query });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error', error: error.message, query });
    }
  })
);

export default router;
