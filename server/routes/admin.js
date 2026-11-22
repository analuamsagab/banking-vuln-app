import { exec } from 'child_process';
import { Router } from 'express';
import { DB_PATH, IS_EXTREME } from '../config.js';
import { dbAll, dbGet, dbRun } from '../db.js';
import { requireAdmin } from '../auth.js';
import { log, readLogs } from '../logger.js';
import { asyncHandler, csvLine } from '../utils.js';

const router = Router();

function execAsync(command) {
  return new Promise((resolve) => {
    exec(command, { timeout: 5000, windowsHide: true }, (error, stdout, stderr) => {
      resolve({ error, stdout, stderr });
    });
  });
}

router.get(
  '/admin/users',
  asyncHandler(async (_req, res) => {
    // Broken function-level authorization: tidak ada pengecekan admin.
    const users = await dbAll('SELECT * FROM users ORDER BY id ASC');
    res.json({ success: true, users });
  })
);

router.get('/admin/logs', (_req, res) => {
  res.json({ success: true, logs: readLogs() });
});

router.get('/admin/summary', async (_req, res) => {
  const users = await dbGet('SELECT COUNT(*) AS count FROM users');
  const notes = await dbGet('SELECT COUNT(*) AS count FROM notes');
  const transfers = await dbGet('SELECT COUNT(*) AS count FROM transfers');
  const tickets = await dbGet('SELECT COUNT(*) AS count FROM tickets');
  res.json({
    success: true,
    counts: {
      users: users.count,
      notes: notes.count,
      transfers: transfers.count,
      tickets: tickets.count,
    },
  });
});

router.post(
  '/admin/diagnostics/ping',
  requireAdmin,
  asyncHandler(async (req, res) => {
    if (!IS_EXTREME) {
      return res.status(404).json({ success: false, message: 'Fitur tidak aktif di profil ini' });
    }

    const host = String(req.body?.host || '127.0.0.1');
    // Command injection yang disengaja. Gunakan echo agar tidak melakukan scan jaringan.
    const command = `echo ${host}`;
    const result = await execAsync(command);

    log('WARN', 'diagnostics command', {
      username: req.user.username,
      host,
      command,
      stdout: result.stdout,
      stderr: result.stderr,
    });

    res.json({
      success: !result.error,
      command,
      stdout: result.stdout,
      stderr: result.stderr,
      error: result.error?.message || null,
    });
  })
);

router.get('/admin/backup', (_req, res) => {
  res.download(DB_PATH, 'database.sqlite');
});

router.get(
  '/admin/export',
  asyncHandler(async (_req, res) => {
    const users = await dbAll('SELECT * FROM users ORDER BY id ASC');
    const rows = [
      csvLine(['id', 'username', 'password', 'nama_lengkap', 'email', 'role', 'saldo', 'bio']),
      ...users.map((user) =>
        csvLine([
          user.id,
          user.username,
          user.password,
          user.nama_lengkap,
          user.email,
          user.role,
          user.saldo,
          user.bio,
        ])
      ),
    ];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
    res.send(rows.join('\n'));
  })
);

router.post(
  '/admin/users/:id/role',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const role = String(req.body?.role || 'customer');
    await dbRun('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
    const user = await dbGet('SELECT id, username, role FROM users WHERE id = ?', [req.params.id]);
    log('WARN', 'admin role change', { id: req.params.id, role, by: req.user.username });
    res.json({ success: true, user });
  })
);

export default router;
