import crypto from 'crypto';
import { Router } from 'express';
import { dbGet, dbRun } from '../db.js';
import {
  clearSessionCookie,
  createEmptySession,
  createSession,
  currentUserResponse,
  issueJwt,
  requireAuth,
  setSessionCookie,
} from '../auth.js';
import { log } from '../logger.js';
import {
  asyncHandler,
  getBaseUrl,
  parseBasicAuth,
  safeUser,
} from '../utils.js';

const router = Router();

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { username, password, nama_lengkap, email, role } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username dan password wajib diisi' });
    }

    const existing = await dbGet('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Username sudah dipakai' });
    }

    // Mass assignment: role dari body diterima apa adanya.
    const result = await dbRun(
      `INSERT INTO users (username, password, nama_lengkap, email, role, saldo, bio)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        username,
        password,
        nama_lengkap || username,
        email || `${username}@example.test`,
        role || 'customer',
        1000000,
        '',
      ]
    );

    const user = await dbGet('SELECT * FROM users WHERE id = ?', [result.lastID]);
    log('INFO', 'register', {
      username,
      password,
      role: role || 'customer',
      ip: req.ip,
    });

    return res.json({ success: true, user: safeUser(user) });
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username dan password wajib diisi' });
    }

    // SQL Injection yang disengaja.
    const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
    log('INFO', 'login attempt', {
      username,
      password,
      ip: req.ip,
      ua: req.headers['user-agent'],
    });
    log('DEBUG', 'SQL query', { query });

    let row;
    try {
      row = await dbGet(query);
    } catch (error) {
      log('ERROR', 'login query error', { query, error: error.message });
      return res.status(500).json({
        success: false,
        message: 'Kesalahan database',
        error: error.message,
        query,
      });
    }

    if (!row) {
      return res.status(401).json({
        success: false,
        message: `User "${username}" tidak ditemukan atau password salah`,
      });
    }

    const sid = req.body.sid || req.query.sid || crypto.randomUUID();
    const mfaVerified = !row.mfa_enabled;
    await createSession(row.id, sid, mfaVerified);
    setSessionCookie(res, sid);

    const token = issueJwt(row, mfaVerified);
    log('INFO', 'login success', {
      username: row.username,
      role: row.role,
      sid,
      mfa_verified: mfaVerified,
    });

    return res.json({
      success: true,
      user: { ...safeUser(row), mfa_verified: mfaVerified },
      token,
      session_id: sid,
      mfa_required: !!row.mfa_enabled,
    });
  })
);

router.post('/logout', (req, res) => {
  // Sengaja tidak menghapus session di database. Token lama tetap valid.
  clearSessionCookie(res);
  log('INFO', 'logout', { ip: req.ip });
  res.json({ success: true, message: 'Logout berhasil' });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ success: true, user: currentUserResponse(req) });
});

router.get(
  '/session',
  asyncHandler(async (req, res) => {
    const sid = req.query.sid || crypto.randomUUID();
    await createEmptySession(sid);
    setSessionCookie(res, sid);
    res.json({ success: true, sid, message: 'Session cookie diset' });
  })
);

router.post(
  '/mfa/verify',
  requireAuth,
  asyncHandler(async (req, res) => {
    const code = String(req.body?.code || '');
    const bypass = req.body?.bypass === true;

    // OTP 000000 selalu diterima. Tidak ada rate limit dan tidak ada lockout.
    if (code !== '000000' && !bypass) {
      log('WARN', 'mfa failed', { username: req.user.username, code });
      return res.status(401).json({ success: false, message: 'Kode OTP salah' });
    }

    if (req.session) {
      await dbRun('UPDATE sessions SET mfa_verified = 1 WHERE token = ?', [req.session.token]);
    } else {
      const session = await createSession(req.user.id, crypto.randomUUID(), true);
      setSessionCookie(res, session.token);
    }

    log('INFO', 'mfa verified', { username: req.user.username, code });
    res.json({ success: true, message: 'MFA berhasil diverifikasi' });
  })
);

router.post(
  '/forgot',
  asyncHandler(async (req, res) => {
    const username = String(req.body?.username || '');
    const user = await dbGet('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Username tidak ditemukan' });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    await dbRun('UPDATE users SET reset_otp = ?, reset_otp_expires = ? WHERE id = ?', [
      otp,
      Date.now() + 60 * 60 * 1000,
      user.id,
    ]);

    const resetUrl = `${getBaseUrl(req)}/reset?username=${encodeURIComponent(
      username
    )}&token=${otp}`;

    log('INFO', 'password reset requested', {
      username,
      otp,
      reset_url: resetUrl,
      host: req.headers.host,
      x_forwarded_host: req.headers['x-forwarded-host'],
    });

    return res.json({
      success: true,
      message: 'Instruksi reset dikirim. Cek log server.',
      debug_otp: otp,
      reset_url: resetUrl,
    });
  })
);

router.post(
  '/reset',
  asyncHandler(async (req, res) => {
    const { username, otp, new_password } = req.body || {};
    if (!username || !otp || !new_password) {
      return res.status(400).json({ success: false, message: 'Data reset tidak lengkap' });
    }

    // SQL Injection yang disengaja pada proses reset.
    const query = `UPDATE users SET password = '${new_password}', reset_otp = NULL
      WHERE username = '${username}' AND reset_otp = '${otp}'`;

    try {
      const result = await dbRun(query);
      log('INFO', 'password reset attempt', { username, otp, query, changes: result.changes });
      if (!result.changes) {
        return res.status(400).json({ success: false, message: 'OTP salah atau kedaluwarsa' });
      }
      return res.json({ success: true, message: 'Password berhasil direset' });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Gagal reset password',
        error: error.message,
        query,
      });
    }
  })
);

router.get('/redirect', (req, res) => {
  const next = String(req.query.next || '/');
  log('INFO', 'redirect', { next });
  res.redirect(next);
});

router.get('/legacy', (req, res) => {
  const credentials = parseBasicAuth(req.headers.authorization);
  if (!credentials) {
    res.set('WWW-Authenticate', 'Basic realm="Bank UBS Legacy"');
    return res.status(401).send('Basic authentication required');
  }

  log('INFO', 'legacy basic auth', {
    username: credentials.username,
    password: credentials.password,
    authorization: req.headers.authorization,
  });

  const query = `SELECT * FROM users WHERE username = '${credentials.username}' AND password = '${credentials.password}'`;
  dbGet(query)
    .then((user) => {
      if (!user) return res.status(401).json({ success: false, message: 'Kredensial salah' });
      return res.json({ success: true, user: safeUser(user) });
    })
    .catch((error) => res.status(500).json({ success: false, message: error.message }));
});

export default router;
