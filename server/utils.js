import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function safeUser(row) {
  if (!row) return null;
  const { password, reset_otp, reset_otp_expires, ...rest } = row;
  return rest;
}

export function getBaseUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || '127.0.0.1:3001';
  return `${proto}://${host}`;
}

export function parseBasicAuth(header) {
  if (!header || !header.startsWith('Basic ')) return null;
  try {
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const index = decoded.indexOf(':');
    if (index === -1) return null;
    return { username: decoded.slice(0, index), password: decoded.slice(index + 1) };
  } catch {
    return null;
  }
}

export function isLoopback(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const candidates = [req.ip, req.socket?.remoteAddress, ...forwarded].filter(Boolean);
  return candidates.some(
    (ip) =>
      ip === '127.0.0.1' ||
      ip === '::1' ||
      ip === '::ffff:127.0.0.1' ||
      String(ip).includes('127.0.0.1')
  );
}

export async function fetchUrl(rawUrl) {
  const url = String(rawUrl || '').trim();
  if (!url) throw new Error('URL wajib diisi');

  if (url.startsWith('file://')) {
    const filePath = fileURLToPath(url);
    return {
      url,
      status: 200,
      headers: { 'content-type': 'text/plain' },
      body: fs.readFileSync(filePath, 'utf8').slice(0, 50000),
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
    });
    const body = await response.text();
    return {
      url,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: body.slice(0, 50000),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function expandXmlEntities(xml) {
  const entities = {};
  const entityRegex = /<!ENTITY\s+([A-Za-z_][\w.-]*)\s+SYSTEM\s+["']([^"']+)["']\s*>/g;
  let match;

  while ((match = entityRegex.exec(xml))) {
    const [, name, uri] = match;
    try {
      if (uri.startsWith('file://')) {
        entities[name] = fs.readFileSync(fileURLToPath(uri), 'utf8');
      } else if (uri.startsWith('http://') || uri.startsWith('https://')) {
        const response = await fetch(uri);
        entities[name] = await response.text();
      } else {
        entities[name] = fs.readFileSync(path.resolve(uri), 'utf8');
      }
    } catch (error) {
      entities[name] = `ERROR: ${error.message}`;
    }
  }

  let expanded = xml;
  for (const [name, value] of Object.entries(entities)) {
    expanded = expanded.split(`&${name};`).join(value);
  }

  return { entities, expanded };
}

export function mergePrototype(target, source) {
  if (!source || typeof source !== 'object') return target;
  for (const key in source) {
    const value = source[key];
    if (value && typeof value === 'object') {
      if (!target[key]) target[key] = {};
      mergePrototype(target[key], value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

export function csvLine(values) {
  // Sengaja tidak melakukan escaping. Nilai yang diawali =, +, -, @
  // akan dieksekusi sebagai formula saat CSV dibuka di Excel.
  return values.join(',');
}
