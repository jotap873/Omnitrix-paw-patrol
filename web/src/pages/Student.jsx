import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import Semaforo from '../components/Semaforo.jsx';
import StudentName from '../components/StudentName.jsx';
import StudentForm from '../components/StudentForm.jsx';

const LEVEL = { yellow: 'Amarillo', red: 'Rojo' };
const OUTCOME = { intervened: 'Intervención a tiempo', escalated: 'Escaló a crisis', resolved: 'Se resolvió solo' };
const fmt = (iso) => iso ? new Date(iso).toLocaleString('es-CL') : '—';
const minutes = (a, b) => Math.round((new Date(b) - new Date(a)) / 60000);

export default function Student() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [s, setS] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);

  const load = () => api.student(id).then(setS).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!s) return <p className="muted">Cargando…</p>;

  const remove = async () => {
    if (!confirm(`¿Eliminar a ${s.first_name} ${s.last_name} y todo su historial? Esta acción no se puede deshacer.`)) return;
    await api.deleteStudent(s.id);
    navigate(`/salas/${s.room_id}`);
  };

  return (
    <>
      <Link to={`/salas/${s.room_id}`} className="muted">← {s.room_name}</Link>
      <div className="row between">
        <h1><StudentName student={s} /></h1>
        <Semaforo status={s.status} />
      </div>

      {editing ? (
        <StudentForm
          initial={s}
          onCancel={() => setEditing(false)}
          onSubmit={async (data) => { await api.updateStudent(s.id, data); setEditing(false); load(); }}
        />
      ) : (
        <section className="card">
          <div className="row between"><h2>Datos personales</h2><button className="secondary" onClick={() => setEditing(true)}>Editar</button></div>
          <dl className="facts">
            <dt>Edad</dt><dd>{s.age != null ? `${s.age} años` : '—'}</dd>
            <dt>Curso</dt><dd>{s.course || '—'}</dd>
            <dt>Diagnóstico</dt><dd>{s.diagnosis || '—'}</dd>
            <dt>Observaciones</dt><dd>{s.notes || '—'}</dd>
          </dl>
        </section>
      )}

      <section className="card">
        <h2>Pulsera y baseline</h2>
        <dl className="facts">
          <dt>Pulsera</dt><dd>{s.device ? `${s.device.serial} (${s.device.transport?.toUpperCase() ?? '—'}, batería ${s.device.battery_pct ?? '?'}%)` : 'Sin pulsera asignada'}</dd>
          <dt>Baseline</dt>
          <dd>{s.baseline
            ? `HR ${s.baseline.hr_mean} lpm · RMSSD ${s.baseline.rmssd_mean} ms · calibrado ${fmt(s.baseline.created_at + 'Z')}`
            : 'Sin calibrar'}</dd>
        </dl>
        <p className="muted small">Emparejamiento y calibración se habilitarán en los próximos módulos.</p>
      </section>

      <section className="card">
        <h2>Historial de alertas</h2>
        {s.alerts.length === 0 ? <p className="muted">Sin alertas registradas.</p> : (
          <table>
            <thead><tr><th>Nivel</th><th>Inicio</th><th>Duración</th><th>Resultado</th></tr></thead>
            <tbody>
              {s.alerts.map((a) => (
                <tr key={a.id}>
                  <td><Semaforo status={a.level} showLabel={false} /> {LEVEL[a.level]}</td>
                  <td>{fmt(a.started_at)}</td>
                  <td>{a.ended_at ? `${minutes(a.started_at, a.ended_at)} min` : 'En curso'}</td>
                  <td>{OUTCOME[a.outcome] ?? '—'}{a.notes && <div className="muted small">{a.notes}</div>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <h2>Tendencias fisiológicas</h2>
        <p className="muted">Los gráficos de HR, RMSSD y EDA aparecerán aquí cuando la pulsera empiece a enviar datos.</p>
      </section>

      <button className="danger" onClick={remove}>Eliminar estudiante</button>
    </>
  );
}
