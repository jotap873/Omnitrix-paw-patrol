import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';

export default function Rooms() {
  const { teacher } = useAuth();
  const [rooms, setRooms] = useState(null);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [school, setSchool] = useState('');

  const load = () => api.rooms().then(setRooms).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    try {
      await api.createRoom({ name, school });
      setName(''); setSchool(''); setShowForm(false);
      load();
    } catch (err) { setError(err.message); }
  };

  return (
    <>
      <div className="row between">
        <h1>Hola, {teacher.full_name}</h1>
        <button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Cancelar' : '+ Nueva sala'}</button>
      </div>
      {showForm && (
        <form onSubmit={create} className="card stack">
          <label>Nombre de la sala / curso<input value={name} onChange={(e) => setName(e.target.value)} required /></label>
          <label>Establecimiento (opcional)<input value={school} onChange={(e) => setSchool(e.target.value)} /></label>
          <button type="submit">Crear sala</button>
        </form>
      )}
      {error && <p className="error">{error}</p>}
      {!rooms ? <p className="muted">Cargando…</p> : rooms.length === 0 ? (
        <p className="muted">Aún no tienes salas. Crea una para comenzar.</p>
      ) : (
        <ul className="grid">
          {rooms.map((r) => (
            <li key={r.id}>
              <Link to={`/salas/${r.id}`} className="card room-card">
                <strong>{r.name}</strong>
                {r.school && <span className="muted">{r.school}</span>}
                <span>{r.student_count} estudiantes</span>
                {r.open_alerts > 0 && <span className="badge">{r.open_alerts} alerta(s) activa(s)</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
