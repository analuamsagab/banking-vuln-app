import crypto from 'crypto';
import { JWT_SECRET } from './config.js';
import { dbGet, dbRun } from './db.js';
import { safeUser } from './utils.js';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

export function issueJwt(user, mfaVerified = false) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: user.id,
    username: user.username,
    role: user.role,
    mfa_verified: !!mfaVerified,
    iat: now,
    exp: now + 7 * 24 * 60 * 60,
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyJwt(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;

  try {
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));

    // Sengaja menerima alg:none. Ini memungkinkan forge token tanpa signature.
    if (header.alg === 'none') return payload;

    if (header.alg !== 'HS256' || parts.length !== 3) return null;

    const expected = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${parts[0]}.${parts[1]}`)
      .digest('base64url');

    if (parts[2] !== expected) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function createSession(userId, sid = null, mfaVerified = false) {
  const token = sid || crypto.randomUUID();
  const expiresAt = Date.now() + SESSION_TTL_MS;

  await dbRun(
    `INSERT INTO sessions (token, user_id, mfa_verified, expires_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(token) DO UPDATE SET
       user_id = excluded.user_id,
       mfa_verified = excluded.mfa_verified,
       expires_at = excluded.expires_at`,
    [token, userId, mfaVerified ? 1 : 0, expiresAt]
  );

  return { token, expiresAt };
}

export async function createEmptySession(sid = null) {
  const token = sid || crypto.randomUUID();
  const expiresAt = Date.now() + SESSION_TTL_MS;
  await dbRun(
    `INSERT OR IGNORE INTO sessions (token, user_id, mfa_verified, expires_at)
     VALUES (?, NULL, 0, ?)`,
    [token, expiresAt]
  );
  return { token, expiresAt };
}

export async function getSessionByToken(token) {
  if (!token) return null;
  return dbGet(
    'SELECT * FROM sessions WHERE token = ? AND expires_at > ?',
    [token, Date.now()]
  );
}

export const cookieOptions = {
  httpOnly: false,
  secure: false,
  sameSite: 'lax',
  path: '/',
  maxAge: SESSION_TTL_MS,
};

export function setSessionCookie(res, token) {
  res.cookie('sid', token, cookieOptions);
}

export function clearSessionCookie(res) {
  res.clearCookie('sid', { ...cookieOptions, maxAge: undefined });
}

export async function attachUser(req, _res, next) {
  req.user = null;
  req.session = null;
  req.mfaVerified = false;
  req.authMethod = null;

  try {
    const headerUserId = req.headers['x-user-id'];
    if (headerUserId) {
      const user = await dbGet('SELECT * FROM users WHERE id = ?', [headerUserId]);
      if (user) {
        req.user = user;
        req.authMethod = 'x-user-id';
        req.mfaVerified = true;
        return next();
      }
    }

    const authorization = req.headers.authorization || '';
    if (authorization.startsWith('Bearer ')) {
      const payload = verifyJwt(authorization.slice(7).trim());
      if (payload) {
        const user = await dbGet('SELECT * FROM users WHERE id = ?', [payload.sub]);
        if (user) {
          req.user = user;
          req.jwt = payload;
          req.authMethod = 'jwt';
          req.mfaVerified = !!payload.mfa_verified;
          return next();
        }
      }
    }

    const sid = req.cookies?.sid;
    if (sid) {
      const session = await getSessionByToken(sid);
      if (session && session.user_id) {
        const user = await dbGet('SELECT * FROM users WHERE id = ?', [session.user_id]);
        if (user) {
          req.user = user;
          req.session = session;
          req.authMethod = 'cookie';
          req.mfaVerified = !!session.mfa_verified;
        }
      }
    }
  } catch (error) {
    console.error('attachUser error:', error.message);
  }

  return next();
}

export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Autentikasi diperlukan' });
  }
  return next();
}

export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Autentikasi diperlukan' });
  }
  // isAdmin bisa berasal dari prototype pollution.
  if (req.user.role !== 'admin' && req.user.isAdmin !== true) {
    return res.status(403).json({ success: false, message: 'Akses admin diperlukan' });
  }
  return next();
}

export function currentUserResponse(req) {
  return {
    ...safeUser(req.user),
    mfa_verified: req.mfaVerified,
    auth_method: req.authMethod,
  };
}
