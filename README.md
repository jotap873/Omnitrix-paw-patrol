# Sensoria PIE

App web para monitorear la regulación sensorial de estudiantes neurodivergentes
en aulas PIE, a partir de una pulsera con sensores EDA y PPG.

La arquitectura completa está en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).

## Estructura

```
server/   API (Node.js + Express + SQLite)
  src/db.js          esquema de la base de datos
  src/auth.js        contraseñas (scrypt) y sesiones
  src/routes/        endpoints: auth, rooms, students
  src/seed.js        datos de demostración
  test/              tests de la API
web/      Frontend (React + Vite)
  src/pages/         Login, Salas, Sala, Ficha de estudiante, Ayuda
  src/components/    Semáforo, formularios
docs/     Documentación
```

## Cómo ejecutarla

Requisitos: Node.js 22.13 o superior (recomendado: la versión LTS de nodejs.org). No hace falta instalar Python ni otras herramientas.

```bash
npm install          # instala todo
npm run seed         # crea datos de demo (usuario: docente / contraseña: demo1234)
npm run dev          # API en :3001 y app en http://localhost:5173
```

Para abrirla desde una tablet o celular en la misma red WiFi, usa la dirección
`http://<IP-de-tu-computador>:5173` que muestra Vite al iniciar.

### Versión de producción

```bash
npm run build        # compila el frontend en web/dist
npm start            # el servidor entrega API + app en http://localhost:3001
```

### Tests

```bash
npm test
```
