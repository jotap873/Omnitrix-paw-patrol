import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PATH = path.join(__dirname, '..', 'data', 'sensoria.db');

// Esquema completo del sistema. Algunas tablas (devices, baselines, readings,
// alerts) se usarán en módulos posteriores, pero se definen desde ya para que
// la estructura de datos sea estable.
const SCHEMA = `
CREATE TABLE IF NOT EXISTS teachers (
  id            INTEGER PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
  full_name     TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Sesiones persistentes: solo se guarda el hash SHA-256 del token,
-- nunca el token en claro. Se eliminan al cerrar sesión.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash   TEXT PRIMARY KEY,
  teacher_id   INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rooms (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  school     TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Relación muchos-a-muchos: un docente puede tener varias salas PIE
-- y una sala puede tener varios docentes (profesor/a + educador/a diferencial).
CREATE TABLE IF NOT EXISTS room_teachers (
  room_id    INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  PRIMARY KEY (room_id, teacher_id)
);

CREATE TABLE IF NOT EXISTS students (
  id         INTEGER PRIMARY KEY,
  room_id    INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name  TEXT NOT NULL,
  birth_date TEXT,
  course     TEXT,
  diagnosis  TEXT,
  notes      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Pulseras (módulo 4)
CREATE TABLE IF NOT EXISTS devices (
  id           INTEGER PRIMARY KEY,
  serial       TEXT NOT NULL UNIQUE,
  student_id   INTEGER REFERENCES students(id) ON DELETE SET NULL,
  transport    TEXT CHECK (transport IN ('ble', 'wifi')),
  battery_pct  INTEGER,
  last_seen_at TEXT
);

-- Baseline individual (módulo 5). Solo uno activo por estudiante.
CREATE TABLE IF NOT EXISTS baselines (
  id                   INTEGER PRIMARY KEY,
  student_id           INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  hr_mean              REAL NOT NULL,
  rmssd_mean           REAL NOT NULL,
  eda_mean             REAL,
  hr_yellow_pct        REAL NOT NULL DEFAULT 15,
  hr_red_pct           REAL NOT NULL DEFAULT 30,
  rmssd_yellow_pct     REAL NOT NULL DEFAULT 20,
  rmssd_red_pct        REAL NOT NULL DEFAULT 40,
  duration_s           INTEGER,
  active               INTEGER NOT NULL DEFAULT 1,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Lecturas fisiológicas (módulo 4 -> 3)
CREATE TABLE IF NOT EXISTS readings (
  id         INTEGER PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  device_id  INTEGER REFERENCES devices(id) ON DELETE SET NULL,
  ts         TEXT NOT NULL,
  hr         REAL,
  rmssd      REAL,
  eda        REAL
);
CREATE INDEX IF NOT EXISTS idx_readings_student_ts ON readings(student_id, ts);

-- Eventos de alerta (módulo 6)
CREATE TABLE IF NOT EXISTS alerts (
  id          INTEGER PRIMARY KEY,
  student_id  INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  room_id     INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  level       TEXT NOT NULL CHECK (level IN ('yellow', 'red')),
  started_at  TEXT NOT NULL,
  ended_at    TEXT,
  outcome     TEXT CHECK (outcome IN ('intervened', 'escalated', 'resolved', NULL)),
  notes       TEXT
);
CREATE INDEX IF NOT EXISTS idx_alerts_student ON alerts(student_id, started_at);
`;

export function openDb(file = process.env.DB_PATH || DEFAULT_PATH) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  // node:sqlite viene incluido en Node.js (>= 22.13): no requiere compilar nada.
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  db.transaction = (fn) => (...args) => {
    db.exec('BEGIN');
    try {
      const result = fn(...args);
      db.exec('COMMIT');
      return result;
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  };
  return db;
}
