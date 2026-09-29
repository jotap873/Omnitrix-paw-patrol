import { openDb } from './db.js';
import { createApp } from './app.js';

const PORT = Number(process.env.PORT) || 3001;
const db = openDb();
createApp(db).listen(PORT, () => {
  console.log(`API escuchando en http://localhost:${PORT}`);
});
