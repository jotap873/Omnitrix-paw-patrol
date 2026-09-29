import { Router } from 'express';
import { STUDENT_STATUS_SQL } from '../status.js';
import { parseStudent } from './students.js';

export default function roomRoutes(db) {
  const r = Router();

  const roomForTeacher = db.prepare(`
    SELECT r.* FROM rooms r JOIN room_teachers rt ON rt.room_id = r.id
    WHERE r.id = ? AND rt.teacher_id = ?`);

  r.get('/', (req, res) => {
    const rooms = db.prepare(`
      SELECT r.id, r.name, r.school,
        (SELECT COUNT(*) FROM students s WHERE s.room_id = r.id) AS student_count,
        (SELECT COUNT(*) FROM alerts a WHERE a.room_id = r.id AND a.ended_at IS NULL) AS open_alerts
      FROM rooms r JOIN room_teachers rt ON rt.room_id = r.id
      WHERE rt.teacher_id = ?
      ORDER BY r.name`).all(req.teacher.id);
    res.json(rooms);
  });

  r.post('/', (req, res) => {
    const name = String(req.body?.name ?? '').trim();
    const school = String(req.body?.school ?? '').trim() || null;
    if (!name) return res.status(400).json({ error: 'El nombre de la sala es obligatorio' });
    const room = db.transaction(() => {
      const { lastInsertRowid } = db.prepare('INSERT INTO rooms (name, school) VALUES (?, ?)').run(name, school);
      db.prepare('INSERT INTO room_teachers (room_id, teacher_id) VALUES (?, ?)').run(lastInsertRowid, req.teacher.id);
      return db.prepare('SELECT * FROM rooms WHERE id = ?').get(lastInsertRowid);
    })();
    res.status(201).json(room);
  });

  r.get('/:id', (req, res) => {
    const room = roomForTeacher.get(req.params.id, req.teacher.id);
    if (!room) return res.status(404).json({ error: 'Sala no encontrada' });
    const students = db.prepare(`
      SELECT s.id, s.first_name, s.last_name, s.course,
        ${STUDENT_STATUS_SQL} AS status,
        d.battery_pct, d.last_seen_at AS device_last_seen
      FROM students s LEFT JOIN devices d ON d.student_id = s.id
      WHERE s.room_id = ?
      ORDER BY s.last_name, s.first_name`).all(room.id);
    res.json({ ...room, students });
  });

  r.post('/:id/students', (req, res) => {
    const room = roomForTeacher.get(req.params.id, req.teacher.id);
    if (!room) return res.status(404).json({ error: 'Sala no encontrada' });
    const { data, error } = parseStudent(req.body, { partial: false });
    if (error) return res.status(400).json({ error });
    const { lastInsertRowid } = db.prepare(`
      INSERT INTO students (room_id, first_name, last_name, birth_date, course, diagnosis, notes)
      VALUES (@room_id, @first_name, @last_name, @birth_date, @course, @diagnosis, @notes)`)
      .run({ birth_date: null, course: null, diagnosis: null, notes: null, ...data, room_id: room.id });
    res.status(201).json(db.prepare('SELECT * FROM students WHERE id = ?').get(lastInsertRowid));
  });

  return r;
}
