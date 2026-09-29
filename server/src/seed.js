// Carga datos de demostración (ficticios) para probar la app.
//   Usuario: docente   Contraseña: demo1234
import { openDb } from './db.js';
import { hashPassword } from './auth.js';
import { pathToFileURL } from 'node:url';

export function seed(db) {
  if (db.prepare('SELECT 1 FROM teachers WHERE username = ?').get('docente')) {
    return false;
  }
  db.transaction(() => {
    const teacherId = db.prepare('INSERT INTO teachers (username, full_name, password_hash) VALUES (?, ?, ?)')
      .run('docente', 'Docente Demo', hashPassword('demo1234')).lastInsertRowid;

    const addRoom = db.prepare('INSERT INTO rooms (name, school) VALUES (?, ?)');
    const link = db.prepare('INSERT INTO room_teachers (room_id, teacher_id) VALUES (?, ?)');
    const addStudent = db.prepare(`INSERT INTO students (room_id, first_name, last_name, birth_date, course, diagnosis)
      VALUES (?, ?, ?, ?, ?, ?)`);

    const roomA = addRoom.run('3° Básico A — PIE', 'Escuela Demo').lastInsertRowid;
    const roomB = addRoom.run('5° Básico B — PIE', 'Escuela Demo').lastInsertRowid;
    link.run(roomA, teacherId);
    link.run(roomB, teacherId);

    const a1 = addStudent.run(roomA, 'Tomás', 'Pérez', '2017-04-12', '3° Básico A', 'TEA nivel 1').lastInsertRowid;
    const a2 = addStudent.run(roomA, 'Valentina', 'Rojas', '2017-08-30', '3° Básico A', 'TPS (procesamiento sensorial)').lastInsertRowid;
    addStudent.run(roomA, 'Matías', 'González', '2016-11-02', '3° Básico A', null);
    addStudent.run(roomA, 'Sofía', 'Muñoz', '2017-01-19', '3° Básico A', 'TEA nivel 2');
    addStudent.run(roomB, 'Benjamín', 'Soto', '2015-06-07', '5° Básico B', 'TEA nivel 1');
    addStudent.run(roomB, 'Isidora', 'Díaz', '2015-09-25', '5° Básico B', 'TPS');

    // Una alerta abierta y una histórica, para ver el semáforo y el historial.
    db.prepare(`INSERT INTO alerts (student_id, room_id, level, started_at) VALUES (?, ?, 'yellow', ?)`)
      .run(a2, roomA, new Date().toISOString());
    db.prepare(`INSERT INTO alerts (student_id, room_id, level, started_at, ended_at, outcome, notes)
      VALUES (?, ?, 'red', ?, ?, 'intervened', 'Se ofreció rincón de calma y audífonos')`)
      .run(a1, roomA, '2026-09-20T10:15:00.000Z', '2026-09-20T10:27:00.000Z');
    db.prepare(`INSERT INTO baselines (student_id, hr_mean, rmssd_mean, eda_mean, duration_s)
      VALUES (?, 88, 52, 2.1, 300)`).run(a1);
  })();
  return true;
}

// Se ejecuta solo al llamarlo directamente (npm run seed), también en Windows.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const created = seed(openDb());
  console.log(created ? 'Datos de demo creados. Usuario: docente / demo1234' : 'Los datos de demo ya existían.');
}
