import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { requireAuth } from './auth.js';
import authRoutes from './routes/auth.js';
import roomRoutes from './routes/rooms.js';
import studentRoutes from './routes/students.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIST = path.join(__dirname, '..', '..', 'web', 'dist');

export function createApp(db) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  // Datos de salud de menores: que ningún proxy/navegador los guarde en caché.
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  app.use('/api/auth', authRoutes(db));
  app.use('/api/rooms', requireAuth(db), roomRoutes(db));
  app.use('/api/students', requireAuth(db), studentRoutes(db));
  app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

  // En producción el mismo servidor entrega el frontend compilado.
  if (fs.existsSync(WEB_DIST)) {
    app.use(express.static(WEB_DIST));
    app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(WEB_DIST, 'index.html')));
  }

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  });

  return app;
}
