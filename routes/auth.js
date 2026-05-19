const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');

// ── Simple JWT-style token (no external deps) ───────────────
// Signs a payload with ADMIN_SECRET using HMAC-SHA256

function sign(payload) {
  const header  = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
  const body    = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig     = crypto.createHmac('sha256', process.env.ADMIN_SECRET || 'changeme')
                        .update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

function verify(token) {
  try {
    const [header, body, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', process.env.ADMIN_SECRET || 'changeme')
                           .update(`${header}.${body}`).digest('base64url');
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp < Date.now()) return null; // expired
    return payload;
  } catch {
    return null;
  }
}

// ── Middleware: protect admin routes ────────────────────────
function requireAdmin(req, res, next) {
  const auth  = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token || !verify(token)) {
    return res.status(401).json({ error: 'Unauthorised' });
  }
  next();
}

// ── POST /api/auth/login ────────────────────────────────────
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  const validUser = process.env.ADMIN_USERNAME || 'admin';
  const validPass = process.env.ADMIN_PASSWORD || 'changeme123';

  if (username !== validUser || password !== validPass) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = sign({
    sub: username,
    exp: Date.now() + 1000 * 60 * 60 * 24, // 24 hours
  });

  res.json({ success: true, token });
});

// ── GET /api/auth/verify ────────────────────────────────────
router.get('/verify', requireAdmin, (req, res) => {
  res.json({ valid: true });
});

module.exports = { router, requireAdmin };
