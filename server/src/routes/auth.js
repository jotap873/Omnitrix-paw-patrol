import { Router } from 'express';
import {
  SESSION_COOKIE, cookieOptions, createSession, destroySession, login, loginRateLimiter, requireAuth,
} from '../auth.js';

export default function authRoutes(db) {
  const r = Router();

  r.post('/login', loginRateLimiter(), (req, res) => {
    const { username, password } = req.body ?? {};
    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' });
    }
    const teacher = login(db, username.trim(), password);
    if (!teacher) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    const token = createSession(db, teacher.id);
    res.cookie(SESSION_COOKIE, token, cookieOptions());
    res.json({ id: teacher.id, username: teacher.username, full_name: teacher.full_name });
  });

  r.post('/logout', (req, res) => {
    destroySession(db, req.cookies?.[SESSION_COOKIE]);
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    res.json({ ok: true });
  });

  r.get('/me', requireAuth(db), (req, res) => res.json(req.teacher));

  return r;
}
