import { createContext, useContext, useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { api } from './api.js';
import Login from './pages/Login.jsx';
import Rooms from './pages/Rooms.jsx';
import Room from './pages/Room.jsx';
import Student from './pages/Student.jsx';
import Help from './pages/Help.jsx';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// "Modo discreto": muestra solo iniciales, para que si alguien mira la pantalla
// del docente no pueda identificar al estudiante (diseño no estigmatizante).
const DiscreetContext = createContext(null);
export const useDiscreet = () => useContext(DiscreetContext);

function readDiscreet() {
  try { return localStorage.getItem('discreet') === '1'; } catch { return false; }
}

export default function App() {
  const [teacher, setTeacher] = useState(undefined); // undefined = cargando
  const [discreet, setDiscreetState] = useState(readDiscreet);
  const navigate = useNavigate();

  useEffect(() => {
    api.me().then(setTeacher).catch(() => setTeacher(null));
  }, []);

  const setDiscreet = (v) => {
    setDiscreetState(v);
    try { localStorage.setItem('discreet', v ? '1' : '0'); } catch { /* sin almacenamiento */ }
  };

  const logout = async () => {
    await api.logout().catch(() => {});
    setTeacher(null);
    navigate('/login');
  };

  if (teacher === undefined) return <div className="center muted">Cargando…</div>;

  return (
    <AuthContext.Provider value={{ teacher, setTeacher, logout }}>
      <DiscreetContext.Provider value={{ discreet, setDiscreet }}>
        {teacher && (
          <header className="topbar">
            <Link to="/" className="brand">Sensoria PIE</Link>
            <nav>
              <label className="toggle" title="Mostrar solo iniciales">
                <input type="checkbox" checked={discreet} onChange={(e) => setDiscreet(e.target.checked)} />
                Modo discreto
              </label>
              <Link to="/ayuda">Ayuda</Link>
              <button className="link" onClick={logout}>Cerrar sesión</button>
            </nav>
          </header>
        )}
        <main className="container">
          <Routes>
            <Route path="/login" element={teacher ? <Navigate to="/" replace /> : <Login />} />
            <Route path="/" element={<Protected><Rooms /></Protected>} />
            <Route path="/salas/:id" element={<Protected><Room /></Protected>} />
            <Route path="/estudiantes/:id" element={<Protected><Student /></Protected>} />
            <Route path="/ayuda" element={<Protected><Help /></Protected>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </DiscreetContext.Provider>
    </AuthContext.Provider>
  );
}

function Protected({ children }) {
  const { teacher } = useAuth();
  return teacher ? children : <Navigate to="/login" replace />;
}
