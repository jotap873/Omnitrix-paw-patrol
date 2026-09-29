import Semaforo from '../components/Semaforo.jsx';

// Versión inicial; el tutorial completo con pasos visuales es el módulo 7.
export default function Help() {
  return (
    <>
      <h1>Ayuda</h1>
      <section className="card">
        <h2>¿Qué significa cada color?</h2>
        <ul className="list">
          <li><Semaforo status="green" /> Valores dentro de su rango habitual. No se requiere acción.</li>
          <li><Semaforo status="yellow" /> Activación sostenida sobre su baseline. Acercarse con discreción y ofrecer estrategias de regulación.</li>
          <li><Semaforo status="red" /> Activación intensa y sostenida: posible crisis inminente. Intervenir según su plan individual.</li>
          <li><Semaforo status="offline" /> La pulsera no está conectada o no envía datos.</li>
        </ul>
      </section>
      <p className="muted">Próximamente: tutoriales de emparejamiento, calibración e interpretación de gráficos.</p>
    </>
  );
}
