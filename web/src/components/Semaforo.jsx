// Indicador de estado. Usa color + forma + texto para que sea legible
// también por personas con daltonismo.
export const STATUS = {
  green: { label: 'Tranquilo', icon: '●' },
  yellow: { label: 'Atención', icon: '▲' },
  red: { label: 'Intervenir', icon: '■' },
  offline: { label: 'Sin pulsera', icon: '○' },
};

export default function Semaforo({ status, showLabel = true }) {
  const s = STATUS[status] ?? STATUS.offline;
  return (
    <span className={`semaforo semaforo-${status}`} role="status" aria-label={s.label}>
      <span aria-hidden="true">{s.icon}</span>
      {showLabel && <span>{s.label}</span>}
    </span>
  );
}
