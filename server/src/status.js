// Estado tipo semáforo de cada estudiante, derivado de los datos guardados:
//   'red' / 'yellow' -> hay una alerta abierta (sin ended_at) de ese nivel
//   'green'          -> pulsera enviando datos recientes y sin alerta abierta
//   'offline'        -> sin pulsera conectada / sin datos recientes
// El motor de alertas (módulo 6) será el encargado de abrir y cerrar alertas.

export const ONLINE_WINDOW_S = 30;

export const STUDENT_STATUS_SQL = `
  CASE
    WHEN EXISTS (SELECT 1 FROM alerts a WHERE a.student_id = s.id AND a.ended_at IS NULL AND a.level = 'red') THEN 'red'
    WHEN EXISTS (SELECT 1 FROM alerts a WHERE a.student_id = s.id AND a.ended_at IS NULL AND a.level = 'yellow') THEN 'yellow'
    WHEN EXISTS (SELECT 1 FROM readings rd WHERE rd.student_id = s.id
                 AND rd.ts >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-${ONLINE_WINDOW_S} seconds')) THEN 'green'
    ELSE 'offline'
  END`;
