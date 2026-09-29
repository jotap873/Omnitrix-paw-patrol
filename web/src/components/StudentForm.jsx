import { useState } from 'react';

const EMPTY = { first_name: '', last_name: '', birth_date: '', course: '', diagnosis: '', notes: '' };

export default function StudentForm({ initial, onSubmit, submitLabel = 'Guardar', onCancel }) {
  const [form, setForm] = useState({ ...EMPTY, ...Object.fromEntries(
    Object.entries(initial ?? {}).filter(([k, v]) => k in EMPTY && v != null)) });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try { await onSubmit(form); } catch (err) { setError(err.message); }
  };

  return (
    <form onSubmit={submit} className="card stack">
      <div className="row">
        <label>Nombre<input value={form.first_name} onChange={set('first_name')} required /></label>
        <label>Apellido<input value={form.last_name} onChange={set('last_name')} required /></label>
      </div>
      <div className="row">
        <label>Fecha de nacimiento<input type="date" value={form.birth_date} onChange={set('birth_date')} /></label>
        <label>Curso<input value={form.course} onChange={set('course')} /></label>
      </div>
      <label>Diagnóstico relevante (opcional)<input value={form.diagnosis} onChange={set('diagnosis')} placeholder="Ej: TEA nivel 1, TPS" /></label>
      <label>Observaciones (opcional)<textarea value={form.notes} onChange={set('notes')} rows={3} placeholder="Estrategias que le ayudan, gatillantes conocidos…" /></label>
      {error && <p className="error">{error}</p>}
      <div className="row">
        <button type="submit">{submitLabel}</button>
        {onCancel && <button type="button" className="secondary" onClick={onCancel}>Cancelar</button>}
      </div>
    </form>
  );
}
