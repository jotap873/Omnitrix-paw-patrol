import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import Semaforo from '../components/Semaforo.jsx';
import StudentName from '../components/StudentName.jsx';
import StudentForm from '../components/StudentForm.jsx';

// Mientras no exista el canal en tiempo real (WebSocket, módulo 4),
// la lista se actualiza consultando la API cada pocos segundos.
const REFRESH_MS = 5000;

export default function Room() {
  const { id } = useParams();
  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => api.room(id).then(setRoom).catch((e) => setError(e.message)), [id]);
  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  if (error) return <p className="error">{error}</p>;
  if (!room) return <p className="muted">Cargando…</p>;

  const needAttention = room.students.filter((s) => s.status === 'red' || s.status === 'yellow')
    .sort((a, b) => (a.status === 'red' ? -1 : 1) - (b.status === 'red' ? -1 : 1));

  return (
    <>
      <Link to="/" className="muted">← Mis salas</Link>
      <div className="row between">
        <h1>{room.name}</h1>
        <button onClick={() => setAdding((v) => !v)}>{adding ? 'Cancelar' : '+ Estudiante'}</button>
      </div>

      {adding && (
        <StudentForm
          submitLabel="Agregar a la lista"
          onSubmit={async (data) => { await api.addStudent(id, data); setAdding(false); load(); }}
        />
      )}

      {needAttention.length > 0 && (
        <section className="attention">
          <h2>Requieren atención</h2>
          <ul className="list">
            {needAttention.map((s) => (
              <li key={s.id}>
                <Link to={`/estudiantes/${s.id}`} className={`card attention-${s.status}`}>
                  <Semaforo status={s.status} /> <StudentName student={s} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <h2>Lista de clase</h2>
      {room.students.length === 0 ? <p className="muted">Esta sala aún no tiene estudiantes.</p> : (
        <ul className="grid">
          {room.students.map((s) => (
            <li key={s.id}>
              <Link to={`/estudiantes/${s.id}`} className={`card student-card status-${s.status}`}>
                <strong><StudentName student={s} /></strong>
                <Semaforo status={s.status} />
                {s.battery_pct != null && <span className="muted small">Batería {s.battery_pct}%</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
