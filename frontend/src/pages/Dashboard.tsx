import { getUsuariActual, logout } from '../services/api';
import { useNavigate, Link } from 'react-router-dom';

export default function Dashboard() {
  const usuari = getUsuariActual();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>Hola, {usuari?.nom} 👋</h1>
        <button onClick={handleLogout}>Sortir</button>
      </div>
      <p>Rol: {usuari?.rol}</p>
      <p>
        <Link to="/tasques">Veure tasques →</Link>
      </p>
      <p>
        <Link to="/checklists">Veure checklists →</Link>
      </p>
      <p>
        <Link to="/recordatoris">Veure recordatoris →</Link>
      </p>
      <p>
        <Link to="/formularis">Veure formularis →</Link>
      </p>
      <p>
        <Link to="/inventari">Veure magatzem →</Link>
      </p>
      {usuari?.rol === 'ENCARREGAT' && (
        <p>
          <Link to="/usuaris">Gestionar usuaris →</Link>
        </p>
      )}
    </div>
  );
}
