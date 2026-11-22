import { Router } from 'express';
import { dbAll, dbGet, dbRun } from '../db.js';
import { requireAuth } from '../auth.js';
import { log } from '../logger.js';
import { asyncHandler, isLoopback, safeUser } from '../utils.js';

const router = Router();

router.get(
  '/users/search',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || '');
    // SQL Injection yang disengaja. dbAll memungkinkan UNION-based extraction.
    const query = `SELECT id, username, nama_lengkap, email, role, saldo
      FROM users
      WHERE username LIKE '%${q}%' OR nama_lengkap LIKE '%${q}%'`;
    try {
      const users = await dbAll(query);
      log('INFO', 'user search', { q, query });
      res.json({ success: true, users, query });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error', error: error.message, query });
    }
  })
);

router.get(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    // SQL Injection + IDOR.
    const query = `SELECT id, username, nama_lengkap, email, role, saldo, bio, created_at
      FROM users WHERE id = ${id}`;
    try {
      const user = await dbGet(query);
      log('INFO', 'user detail', { id, query });
      if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
      res.json({ success: true, user, query });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error', error: error.message, query });
    }
  })
);

router.get(
  '/users/:id/statement',
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    // IDOR: siapa pun bisa membaca statement user lain.
    const query = `SELECT * FROM statements WHERE user_id = ${id}`;
    try {
      const statements = await dbAll(query);
      log('INFO', 'statement read', { id, query });
      res.json({ success: true, statements, query });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error', error: error.message, query });
    }
  })
);

router.put(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const allowed = ['nama_lengkap', 'email', 'bio', 'role', 'saldo'];
    const fields = [];
    const values = [];

    for (const field of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body || {}, field)) {
        fields.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    }

    if (!fields.length) {
      return res.status(400).json({ success: false, message: 'Tidak ada field yang diubah' });
    }

    // Mass assignment: role dan saldo bisa diubah dari body.
    values.push(id);
    try {
      await dbRun(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
      const user = await dbGet(
        'SELECT id, username, nama_lengkap, email, role, saldo, bio FROM users WHERE id = ?',
        [id]
      );
      log('INFO', 'profile update', { id, body: JSON.stringify(req.body) });
      res.json({ success: true, user });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Gagal update', error: error.message });
    }
  })
);

router.get('/account/summary', requireAuth, async (req, res) => {
  const transfers = await dbAll(
    'SELECT * FROM transfers WHERE from_user = ? OR to_user = ? ORDER BY id DESC LIMIT 10',
    [req.user.id, req.user.id]
  );
  const notes = await dbAll('SELECT COUNT(*) AS count FROM notes WHERE user_id = ?', [req.user.id]);
  res.json({
    success: true,
    user: safeUser(req.user),
    transfers,
    notes_count: notes[0]?.count || 0,
  });
});

router.get(
  '/internal/users',
  asyncHandler(async (req, res) => {
    if (!isLoopback(req)) {
      return res.status(403).json({
        success: false,
        message: 'Endpoint internal hanya untuk localhost',
        ip: req.ip,
        x_forwarded_for: req.headers['x-forwarded-for'] || null,
      });
    }

    const users = await dbAll('SELECT * FROM users');
    log('WARN', 'internal users accessed', {
      ip: req.ip,
      x_forwarded_for: req.headers['x-forwarded-for'] || '',
    });

    return res.json({
      success: true,
      internal_api_key: process.env.INTERNAL_API_KEY || 'internal-lab-key-123',
      users,
    });
  })
);

export default router;
