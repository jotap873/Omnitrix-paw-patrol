# Arquitectura — Sensoria PIE

Sistema para detectar tempranamente sobrecarga sensorial en estudiantes
neurodivergentes (TEA, TPS) en aulas PIE, usando una pulsera con sensores
**EDA** y **PPG** (HR, HRV/RMSSD), y alertar discretamente al docente.

## Vista general

```
 ┌──────────────┐   BLE (GATT)    ┌───────────────────────────┐   HTTPS + WebSocket   ┌──────────────────────┐
 │  Pulsera     │ ──────────────► │  App web (PWA)            │ ◄──────────────────► │  Servidor (API)      │
 │  ESP32/nRF   │                 │  React · tablet/celular   │                       │  Node.js + Express   │
 │  EDA + PPG   │                 │  del docente              │                       │                      │
 │              │   WiFi (WS)     └───────────────────────────┘                       │  Motor de alertas    │
 │              │ ─────────────────────────────────────────────────────────────────► │  Base de datos       │
 └──────────────┘                                                                     │  SQLite → PostgreSQL │
                                                                                      └──────────────────────┘
```

### Capas

| Capa | Tecnología | Por qué |
|------|------------|---------|
| **Frontend** | React + Vite, instalable como PWA | Una sola base de código que corre en tablet, celular o notebook. Chrome (Android/PC) soporta **Web Bluetooth**, así que la app puede hablar directo con la pulsera sin publicar una app nativa. |
| **Backend** | Node.js + Express | Simple, mismo lenguaje que el frontend, buen soporte de WebSocket para tiempo real. |
| **Base de datos** | SQLite incluido en Node.js (`node:sqlite`, prototipo) → PostgreSQL (producción) | SQLite no requiere instalar nada; el esquema es SQL estándar y se migra a PostgreSQL cuando haya varias escuelas. |
| **Hardware** | Microcontrolador con BLE y WiFi (ej. ESP32-S3 o nRF52840) | Calcula HR y RMSSD a bordo y envía valores ya procesados (menos datos y menos batería). |

## Conexión de la pulsera

Dos caminos, ambos llegan al mismo endpoint del servidor:

1. **BLE (principal)** — la pulsera expone un servicio GATT propio:
   - Característica *Measurement* (notify): `{ts, hr, rmssd, eda}` cada 1–5 s.
   - *Battery Service* estándar (0x180F).
   - La PWA la empareja con `navigator.bluetooth.requestDevice()`, se suscribe
     a las notificaciones y reenvía las lecturas al servidor por WebSocket.
   - Reconexión automática: al evento `gattserverdisconnected` la app reintenta
     con espera exponencial y muestra “reconectando” en la tarjeta del estudiante.
2. **WiFi (alternativa)** — la pulsera se conecta a la red de la escuela y abre
   un WebSocket directo al servidor, autenticada con un token por dispositivo.
   Útil cuando el docente no tiene un dispositivo con Bluetooth compatible.

Cada pulsera tiene un número de serie y se asigna a un estudiante (tabla `devices`).

## Procesamiento y motor de alertas

1. La lectura llega al servidor → se guarda en `readings`.
2. El motor compara contra el **baseline activo** del estudiante (`baselines`):
   - % de aumento de HR y % de caída de RMSSD respecto al reposo.
   - Se usa una **ventana móvil** (ej. 60 s) para exigir activación *sostenida*,
     no un pico momentáneo.
3. Si pasa a amarillo/rojo se abre un registro en `alerts` y se envía un evento
   por WebSocket (y notificación push) a los docentes de esa sala.
4. Cuando vuelve a verde se cierra la alerta (`ended_at`) y el docente puede
   anotar el resultado (intervenido a tiempo / escaló / se resolvió solo).

## Modelo de datos

```
teachers ──< room_teachers >── rooms ──< students ──< readings
    │                                        │ ├──< alerts
 sessions                                    │ ├──< baselines
                                             └── devices
```

Ver el esquema completo en [`server/src/db.js`](../server/src/db.js).

## Privacidad y seguridad (datos de salud de menores)

- Contraseñas con **scrypt** + sal aleatoria; nunca en texto plano.
- Sesiones con token aleatorio en cookie `httpOnly`; en la base solo se guarda su hash.
- Cada docente **solo ve sus salas** y los estudiantes de ellas.
- Respuestas de la API con `Cache-Control: no-store`.
- **Modo discreto**: muestra solo iniciales en pantalla; las alertas usan
  colores/formas, sin sonidos ni textos visibles para el curso.
- Minimización: el diagnóstico es opcional; no se guardan RUT ni dirección.
- Producción: HTTPS obligatorio, cifrado del disco/BD, respaldos, consentimiento
  informado de apoderados y cumplimiento de la Ley 19.628 (Chile).

## Escalabilidad

- Varias salas y pulseras: cada lectura va etiquetada con `student_id`/`device_id`;
  el WebSocket usa “canales” por sala.
- Para muchos colegios: PostgreSQL (+ TimescaleDB para series de tiempo) y
  varias instancias del servidor detrás de un balanceador.

## Plan de módulos

| # | Módulo | Estado |
|---|--------|--------|
| 1 | Login | ✅ |
| 2 | Salas PIE y lista de clase con semáforo | ✅ |
| 3 | Ficha del estudiante | 🟡 datos, baseline e historial de alertas (faltan gráficos) |
| 4 | Conectividad BLE/WiFi | ⏳ |
| 5 | Calibración de baseline | ⏳ |
| 6 | Motor de alertas | ⏳ |
| 7 | Tutorial / ayuda | 🟡 versión inicial |
