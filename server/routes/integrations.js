import { createRequire } from 'module';
import { Router } from 'express';
import ejs from 'ejs';
import { IS_EXTREME, PUBLIC_CONFIG, LAB_PROFILE } from '../config.js';
import { requireAuth } from '../auth.js';
import { log } from '../logger.js';
import {
  asyncHandler,
  expandXmlEntities,
  fetchUrl,
  mergePrototype,
} from '../utils.js';

const router = Router();
const requireFromHere = createRequire(import.meta.url);

const DOCS = [
  { method: 'POST', path: '/api/auth/register', auth: 'none', note: 'Mass assignment role' },
  { method: 'POST', path: '/api/auth/login', auth: 'none', note: 'SQLi + plaintext HTTP' },
  { method: 'GET', path: '/api/auth/session', auth: 'none', note: 'Session fixation' },
  { method: 'GET', path: '/api/auth/me', auth: 'cookie/jwt', note: 'Current user' },
  { method: 'POST', path: '/api/auth/forgot', auth: 'none', note: 'OTP di response' },
  { method: 'POST', path: '/api/auth/reset', auth: 'none', note: 'SQLi reset password' },
  { method: 'GET', path: '/api/auth/redirect', auth: 'none', note: 'Open redirect' },
  { method: 'GET', path: '/api/auth/legacy', auth: 'basic', note: 'Basic auth over HTTP' },
  { method: 'GET', path: '/api/users/:id', auth: 'none', note: 'SQLi/IDOR' },
  { method: 'GET', path: '/api/users/search', auth: 'none', note: 'SQLi UNION' },
  { method: 'PUT', path: '/api/users/:id', auth: 'none', note: 'Mass assignment role/saldo' },
  { method: 'GET', path: '/api/users/:id/statement', auth: 'none', note: 'IDOR' },
  { method: 'GET', path: '/api/internal/users', auth: 'localhost', note: 'SSRF/IP spoofing target' },
  { method: 'GET', path: '/api/transfer', auth: 'none', note: 'CSRF + negative amount' },
  { method: 'POST', path: '/api/withdraw', auth: 'cookie/jwt', note: 'Race condition' },
  { method: 'POST', path: '/api/bills/pay', auth: 'cookie/jwt', note: 'Price tampering' },
  { method: 'POST', path: '/api/coupons/redeem', auth: 'cookie/jwt', note: 'Replay coupon' },
  { method: 'GET', path: '/api/notes', auth: 'none', note: 'IDOR semua notes' },
  { method: 'POST', path: '/api/notes', auth: 'none', note: 'SQLi + stored XSS' },
  { method: 'GET', path: '/api/support/tickets', auth: 'none', note: 'IDOR + stored XSS' },
  { method: 'GET', path: '/api/support/search', auth: 'none', note: 'SQLi + reflected XSS' },
  { method: 'POST', path: '/api/upload', auth: 'none', note: 'Unrestricted upload' },
  { method: 'GET', path: '/api/files/download?name=', auth: 'none', note: 'Path traversal read' },
  { method: 'POST', path: '/api/integrations/fetch', auth: 'none', note: 'SSRF' },
  { method: 'POST', path: '/api/kyc/import', auth: 'none', note: 'XXE (extreme)' },
  { method: 'POST', path: '/api/notifications/preview', auth: 'cookie/jwt', note: 'SSTI (extreme)' },
  { method: 'POST', path: '/api/profile/preferences', auth: 'cookie/jwt', note: 'Prototype pollution' },
  { method: 'GET', path: '/api/admin/users', auth: 'none', note: 'Broken function-level auth' },
  { method: 'GET', path: '/api/admin/logs', auth: 'none', note: 'Log injection XSS' },
  { method: 'POST', path: '/api/admin/diagnostics/ping', auth: 'admin', note: 'Command injection (extreme)' },
  { method: 'GET', path: '/api/admin/backup', auth: 'none', note: 'Database backup exposure' },
  { method: 'GET', path: '/api/config', auth: 'none', note: 'Secret leak' },
  { method: 'GET', path: '/backup/database.sqlite', auth: 'none', note: 'Backup exposure' },
];

router.post(
  '/integrations/fetch',
  asyncHandler(async (req, res) => {
    const url = String(req.body?.url || '');
    try {
      const result = await fetchUrl(url);
      log('INFO', 'integration fetch', { url, status: result.status });
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Gagal fetch URL', error: error.message });
    }
  })
);

router.post(
  '/kyc/import',
  asyncHandler(async (req, res) => {
    if (!IS_EXTREME) {
      return res.status(404).json({ success: false, message: 'Fitur tidak aktif di profil ini' });
    }

    const xml = typeof req.body === 'string' ? req.body : req.body?.xml || req.body?.data || '';
    if (!xml) return res.status(400).json({ success: false, message: 'XML wajib diisi' });

    try {
      const result = await expandXmlEntities(String(xml));
      log('WARN', 'kyc xml import', { xml: String(xml).slice(0, 500) });
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Gagal parse XML', error: error.message });
    }
  })
);

router.post(
  '/notifications/preview',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!IS_EXTREME) {
      return res.status(404).json({ success: false, message: 'Fitur tidak aktif di profil ini' });
    }

    const template = String(req.body?.template || '');
    if (!template) return res.status(400).json({ success: false, message: 'Template wajib diisi' });

    try {
      const rendered = ejs.render(template, {
        user: req.user,
        config: PUBLIC_CONFIG,
        process,
        require: requireFromHere,
      });
      log('WARN', 'notification template rendered', {
        username: req.user.username,
        template: template.slice(0, 500),
      });
      res.json({ success: true, rendered });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Template error',
        error: error.message,
        stack: error.stack,
      });
    }
  })
);

router.post(
  '/profile/preferences',
  requireAuth,
  asyncHandler(async (req, res) => {
    const source = req.body?.preferences || req.body || {};
    mergePrototype({}, source);
    const polluted = {}.isAdmin === true;
    log('WARN', 'preferences merged', { username: req.user.username, body: JSON.stringify(req.body) });
    res.json({
      success: true,
      message: 'Preferensi disimpan',
      prototype_isAdmin: polluted,
    });
  })
);

router.get('/config', (_req, res) => {
  res.json({ success: true, config: PUBLIC_CONFIG });
});

router.get('/docs', (_req, res) => {
  res.json({
    success: true,
    profile: LAB_PROFILE,
    endpoints: DOCS,
  });
});

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    status: 'ok',
    uptime: process.uptime(),
    platform: process.platform,
    node: process.version,
    profile: LAB_PROFILE,
    db_path: PUBLIC_CONFIG.db_path,
    data_dir: PUBLIC_CONFIG.data_dir,
  });
});

router.get('/debug', (_req, res) => {
  res.json({
    note: 'Semua data dikirim via HTTP plaintext! Gunakan Wireshark untuk melihat credentials.',
    tip: 'Login credentials terlihat jelas di network traffic.',
    profile: LAB_PROFILE,
  });
});

export default router;
