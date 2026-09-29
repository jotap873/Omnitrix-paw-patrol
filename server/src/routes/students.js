import { Router } from 'express';
import { STUDENT_STATUS_SQL } from '../status.js';

const FIELDS = ['first_name', 'last_name', 'birth_date', 'course', 'diagnosis', 'notes'];
const REQUIRED = ['first_name', 'last_name'];

export function parseStudent(body = {}, { partial }) {
  const data = {};
  for (const f of FIELDS) {
    if (body[f] === undefined) continue;
    const v = body[f] === null ? '' : String(body[f]).trim();
    data[f] = v || null;
  }
  for (const f of REQUIRED) {
    if ((!partial || f in data) && !data[f]) return { error: `El campo ${f} es obligatorio` };
  }
  if (data.birth_date && !/^\d{4}-\d{2}-\d{2}$/.test(data.birth_date)) {
    return { error: 'birth_date debe tener formato AAAA-MM-DD' };
  }
  return { data };
}

export function ageFrom(birthDate, now = new Date()) {
  if (!birthDate) return null;
  const b = new Date(birthDate + 'T00:00:00');
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

export default function studentRoutes(db) {
  const r = Router();

  // Un docente solo puede ver estudiantes de salas a las que está asignado.
  const findStudent = db.prepare(`
    SELECT s.*, r.name AS room_name, ${STUDENT_STATUS_SQL} AS status
    FROM students s
    JOIN rooms r ON r.id = s.room_id
    JOIN room_teachers rt ON rt.room_id = s.room_id
    WHERE s.id = ? AND rt.teacher_id = ?`);

  r.get('/:id', (req, res) => {
    const student = findStudent.get(req.params.id, req.teacher.id);
    if (!student) return res.status(404).json({ error: 'Estudiante no encontrado' });
    const baseline = db.prepare(
      'SELECT * FROM baselines WHERE student_id = ? AND active = 1 ORDER BY created_at DESC LIMIT 1').get(student.id);
    const device = db.prepare('SELECT * FROM devices WHERE student_id = ?').get(student.id);
    const alerts = db.prepare(
      'SELECT * FROM alerts WHERE student_id = ? ORDER BY started_at DESC LIMIT 20').all(student.id);
    res.json({ ...student, age: ageFrom(student.birth_date), baseline: baseline ?? null, device: device ?? null, alerts });
  });

  r.patch('/:id', (req, res) => {
    const student = findStudent.get(req.params.id, req.teacher.id);
    if (!student) return res.status(404).json({ error: 'Estudiante no encontrado' });
    const { data, error } = parseStudent(req.body, { partial: true });
    if (error) return res.status(400).json({ error });
    const keys = Object.keys(data);
    if (keys.length) {
      db.prepare(`UPDATE students SET ${keys.map((k) => `${k} = @${k}`).join(', ')} WHERE id = @id`)
        .run({ ...data, id: student.id });
    }
    res.json(db.prepare('SELECT * FROM students WHERE id = ?').get(student.id));
  });

  r.delete('/:id', (req, res) => {
    const student = findStudent.get(req.params.id, req.teacher.id);
    if (!student) return res.status(404).json({ error: 'Estudiante no encontrado' });
    db.prepare('DELETE FROM students WHERE id = ?').run(student.id);
    res.status(204).end();
  });

  return r;
}
