import { Router } from 'express';
import { dbAll, dbGet, dbRun } from '../db.js';
import { log } from '../logger.js';
import { asyncHandler } from '../utils.js';

const router = Router();

router.get(
  '/support/tickets',
  asyncHandler(async (_req, res) => {
    const tickets = await dbAll(
      `SELECT tickets.*, users.username
       FROM tickets LEFT JOIN users ON users.id = tickets.user_id
       ORDER BY tickets.id DESC`
    );
    res.json({ success: true, tickets });
  })
);

router.post(
  '/support/tickets',
  asyncHandler(async (req, res) => {
    const { user_id, subject, message } = req.body || {};
    if (!subject || !message) {
      return res.status(400).json({ success: false, message: 'Subject dan message wajib diisi' });
    }

    const result = await dbRun(
      'INSERT INTO tickets (user_id, subject, message) VALUES (?, ?, ?)',
      [user_id || req.user?.id || 1, subject, message]
    );
    log('INFO', 'ticket created', { user_id: user_id || 1, subject, message });
    res.json({ success: true, id: result.lastID });
  })
);

router.get(
  '/support/search',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || '');
    // SQL Injection yang disengaja.
    const query = `SELECT * FROM tickets
      WHERE subject LIKE '%${q}%' OR message LIKE '%${q}%'`;
    try {
      const tickets = await dbAll(query);
      log('INFO', 'support search', { q, query });
      res.json({ success: true, tickets, query });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error', error: error.message, query });
    }
  })
);

router.get(
  '/support/tickets/:id',
  asyncHandler(async (req, res) => {
    const query = `SELECT tickets.*, users.username FROM tickets
      LEFT JOIN users ON users.id = tickets.user_id WHERE tickets.id = ${req.params.id}`;
    try {
      const ticket = await dbGet(query);
      if (!ticket) return res.status(404).json({ success: false, message: 'Tiket tidak ditemukan' });
      res.json({ success: true, ticket, query });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error', error: error.message, query });
    }
  })
);

export default router;
