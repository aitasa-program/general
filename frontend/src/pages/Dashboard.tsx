import { getUsuariActual, logout } from '../services/api';
import { useNavigate, Link } from 'react-router-dom';

const enllacos = [
  { to: '/tasques', icon: '✅', label: 'Tasques' },
  { to: '/checklists', icon: '📋', label: 'Checklists' },
  { to: '/recordatoris', icon: '🔔', label: 'Recordatoris' },
  { to: '/formularis', icon: '📝', label: 'Formularis' },
  { to: '/inventari', icon: '📦', label: 'Magatzem' },
];

export default function Dashboard() {
  const usuari = getUsuariActual();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ marginBottom: 6 }}>Hola, {usuari?.nom} 👋</h1>
          <span className="badge badge--role">{usuari?.rol}</span>
        </div>
        <button onClick={handleLogout}>Sortir</button>
      </div>

      <div className="nav-grid">
        {enllacos.map((e) => (
          <Link key={e.to} to={e.to} className="card card--clickable nav-tile">
            <span className="nav-tile__icon">{e.icon}</span>
            {e.label}
            <span className="nav-tile__arrow">→</span>
          </Link>
        ))}
        {usuari?.rol === 'ENCARREGAT' && (
          <Link to="/usuaris" className="card card--clickable nav-tile">
            <span className="nav-tile__icon">👥</span>
            Gestionar usuaris
            <span className="nav-tile__arrow">→</span>
          </Link>
        )}
      </div>
    </div>
  );
}
