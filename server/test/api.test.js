import { test, before, after } from "node:test";
import assert from 'node:assert/strict';
import { openDb } from '../src/db.js';
import { createApp } from '../src/app.js';
import { seed } from '../src/seed.js';
import { hashPassword, verifyPassword } from '../src/auth.js';

let base;
let db;
let server;

before(async () => {
  db = openDb(':memory:');
  seed(db);
  // Otro docente con su propia sala, para probar el aislamiento entre docentes.
  const t2 = db.prepare('INSERT INTO teachers (username, full_name, password_hash) VALUES (?, ?, ?)')
    .run('otro', 'Otro Docente', hashPassword('clave5678')).lastInsertRowid;
  const r2 = db.prepare("INSERT INTO rooms (name) VALUES ('Sala ajena')").run().lastInsertRowid;
  db.prepare('INSERT INTO room_teachers VALUES (?, ?)').run(r2, t2);
  db.prepare("INSERT INTO students (room_id, first_name, last_name) VALUES (?, 'Ana', 'Ajena')").run(r2);

  server = createApp(db).listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

async function call(path, { method = 'GET', body, cookie } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...(cookie && { cookie }) },
    body: body && JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, setCookie: res.headers.get('set-cookie') };
}

async function loginAs(username, password) {
  const r = await call('/api/auth/login', { method: 'POST', body: { username, password } });
  assert.equal(r.status, 200);
  return r.setCookie.split(';')[0];
}

test('las contraseñas se guardan con hash y no en texto plano', () => {
  const h = hashPassword('secreto');
  assert.ok(!h.includes('secreto'));
  assert.ok(verifyPassword('secreto', h));
  assert.ok(!verifyPassword('otra', h));
  const stored = db.prepare("SELECT password_hash FROM teachers WHERE username = 'docente'").get();
  assert.match(stored.password_hash, /^scrypt\$/);
});

test('login rechaza credenciales incorrectas', async () => {
  assert.equal((await call('/api/auth/login', { method: 'POST', body: { username: 'docente', password: 'mala' } })).status, 401);
  assert.equal((await call('/api/auth/login', { method: 'POST', body: { username: 'nadie', password: 'x' } })).status, 401);
  assert.equal((await call('/api/auth/login', { method: 'POST', body: {} })).status, 400);
});

test('sesión persistente hasta cerrar sesión', async () => {
  assert.equal((await call('/api/auth/me')).status, 401);
  const cookie = await loginAs('docente', 'demo1234');
  const me = await call('/api/auth/me', { cookie });
  assert.equal(me.status, 200);
  assert.equal(me.body.username, 'docente');
  assert.equal(me.body.password_hash, undefined);
  await call('/api/auth/logout', { method: 'POST', cookie });
  assert.equal((await call('/api/auth/me', { cookie })).status, 401);
});

test('salas y lista de clase con estado de semáforo', async () => {
  const cookie = await loginAs('docente', 'demo1234');
  const rooms = await call('/api/rooms', { cookie });
  assert.equal(rooms.body.length, 2);
  assert.ok(!rooms.body.some((r) => r.name === 'Sala ajena'));

  const roomA = rooms.body.find((r) => r.name.startsWith('3°'));
  const detail = await call(`/api/rooms/${roomA.id}`, { cookie });
  assert.equal(detail.body.students.length, 4);
  const valentina = detail.body.students.find((s) => s.first_name === 'Valentina');
  assert.equal(valentina.status, 'yellow');
  const tomas = detail.body.students.find((s) => s.first_name === 'Tomás');
  assert.equal(tomas.status, 'offline');

  // Una lectura reciente pone al estudiante en verde.
  db.prepare('INSERT INTO readings (student_id, ts, hr, rmssd, eda) VALUES (?, ?, 90, 50, 2)')
    .run(tomas.id, new Date().toISOString());
  const again = await call(`/api/rooms/${roomA.id}`, { cookie });
  assert.equal(again.body.students.find((s) => s.id === tomas.id).status, 'green');
});

test('crear sala, agregar, editar y eliminar estudiante', async () => {
  const cookie = await loginAs('docente', 'demo1234');
  const room = await call('/api/rooms', { method: 'POST', cookie, body: { name: 'Sala nueva' } });
  assert.equal(room.status, 201);

  assert.equal((await call(`/api/rooms/${room.body.id}/students`, { method: 'POST', cookie, body: { first_name: 'X' } })).status, 400);
  const st = await call(`/api/rooms/${room.body.id}/students`, {
    method: 'POST', cookie, body: { first_name: 'Lucas', last_name: 'Vera', birth_date: '2016-03-01' },
  });
  assert.equal(st.status, 201);

  const upd = await call(`/api/students/${st.body.id}`, { method: 'PATCH', cookie, body: { diagnosis: 'TEA' } });
  assert.equal(upd.body.diagnosis, 'TEA');
  assert.equal(upd.body.first_name, 'Lucas');

  const ficha = await call(`/api/students/${st.body.id}`, { cookie });
  assert.equal(typeof ficha.body.age, 'number');
  assert.deepEqual(ficha.body.alerts, []);

  assert.equal((await call(`/api/students/${st.body.id}`, { method: 'DELETE', cookie })).status, 204);
  assert.equal((await call(`/api/students/${st.body.id}`, { cookie })).status, 404);
});

test('un docente no puede ver salas ni estudiantes de otro docente', async () => {
  const cookie = await loginAs('otro', 'clave5678');
  const rooms = await call('/api/rooms', { cookie });
  assert.deepEqual(rooms.body.map((r) => r.name), ['Sala ajena']);
  const ajena = db.prepare("SELECT id FROM students WHERE first_name = 'Tomás'").get();
  assert.equal((await call(`/api/students/${ajena.id}`, { cookie })).status, 404);
  assert.equal((await call(`/api/students/${ajena.id}`, { method: 'PATCH', cookie, body: { notes: 'x' } })).status, 404);
});
