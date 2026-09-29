import crypto from 'node:crypto';

// --- Contraseñas: scrypt (incluido en Node, resistente a fuerza bruta) ---

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 };
const KEY_LEN = 64;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, KEY_LEN, SCRYPT_PARAMS);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(password, stored) {
  const [scheme, saltHex, hashHex] = String(stored).split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length, SCRYPT_PARAMS);
  return crypto.timingSafeEqual(expected, actual);
}

// Hash "señuelo" para que un usuario inexistente tarde lo mismo que uno real
// (evita adivinar nombres de usuario midiendo el tiempo de respuesta).
const DUMMY_HASH = hashPassword('dummy-password-for-timing');

// --- Sesiones persistentes ---

export const SESSION_COOKIE = 'sid';
// La sesión dura hasta que el docente cierre sesión; la cookie se renueva
// en cada uso con una vigencia larga.
const COOKIE_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/',
  };
}

export function createSession(db, teacherId) {
  const token = crypto.randomBytes(32).toString('base64url');
  db.prepare('INSERT INTO sessions (token_hash, teacher_id) VALUES (?, ?)').run(sha256(token), teacherId);
  return token;
}

export function destroySession(db, token) {
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
}

export function login(db, username, password) {
  const teacher = db.prepare('SELECT * FROM teachers WHERE username = ?').get(username);
  const ok = verifyPassword(password, teacher ? teacher.password_hash : DUMMY_HASH);
  return ok && teacher ? teacher : null;
}

export function requireAuth(db) {
  const findSession = db.prepare(`
    SELECT t.id, t.username, t.full_name
    FROM sessions s JOIN teachers t ON t.id = s.teacher_id
    WHERE s.token_hash = ?`);
  const touch = db.prepare("UPDATE sessions SET last_seen_at = datetime('now') WHERE token_hash = ?");

  return (req, res, next) => {
    const token = req.cookies?.[SESSION_COOKIE];
    const tokenHash = token && sha256(token);
    const teacher = tokenHash && findSession.get(tokenHash);
    if (!teacher) return res.status(401).json({ error: 'No autenticado' });
    touch.run(tokenHash);
    res.cookie(SESSION_COOKIE, token, cookieOptions());
    req.teacher = teacher;
    next();
  };
}

// Limitador simple en memoria para frenar intentos de fuerza bruta en el login.
export function loginRateLimiter({ max = 10, windowMs = 15 * 60 * 1000 } = {}) {
  const hits = new Map();
  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || now - entry.start > windowMs) {
      hits.set(key, { start: now, count: 1 });
      return next();
    }
    if (++entry.count > max) {
      return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos.' });
    }
    next();
  };
}
