import { useEffect, useState } from 'react';
import { getUsuariActual, logout } from '../services/api';
import { useNavigate, Link } from 'react-router-dom';
import { RetenActual, obtenirRetenActual } from '../services/reten';
import { QuinzenaActual, obtenirQuinzenaActual } from '../services/quinzena';

const enllacos = [
  { to: '/dia-a-dia', icon: '🗓️', label: 'Dia a dia' },
  { to: '/recordatoris', icon: '🔔', label: 'Recordatoris' },
  { to: '/inventari', icon: '📦', label: 'Magatzem' },
  { to: '/comptadors', icon: '🔢', label: 'Comptadors' },
];

export default function Dashboard() {
  const usuari = getUsuariActual();
  const navigate = useNavigate();
  const [reten, setReten] = useState<RetenActual | null>(null);
  const [quinzena, setQuinzena] = useState<QuinzenaActual | null>(null);

  useEffect(() => {
    obtenirRetenActual().then(setReten).catch(() => setReten(null));
    obtenirQuinzenaActual().then(setQuinzena).catch(() => setQuinzena(null));
  }, []);

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

      {reten && (
        <div className="card" style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>📞</span>
          <div>
            <p style={{ margin: 0, fontWeight: 700 }}>
              De reté aquesta setmana: {reten.usuari ? reten.usuari.nom : 'ningú assignat encara'}
            </p>
            <p className="text-muted" style={{ margin: '2px 0 0', fontSize: 12 }}>
              El reté canvia cada dilluns a les 8:00
            </p>
          </div>
        </div>
      )}

      {quinzena && (
        <div className="card" style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>🔁</span>
          <div>
            <p style={{ margin: 0, fontWeight: 700 }}>
              De quinzena aquesta setmana: {quinzena.usuari ? quinzena.usuari.nom : 'ningú assignat encara'}
            </p>
            <p className="text-muted" style={{ margin: '2px 0 0', fontSize: 12 }}>
              Torn independent del reté, també canvia cada dilluns a les 8:00
            </p>
          </div>
        </div>
      )}

      <div className="nav-grid">
        {enllacos.map((e) => (
          <Link key={e.to} to={e.to} className="card card--clickable nav-tile">
            <span className="nav-tile__icon">{e.icon}</span>
            {e.label}
            <span className="nav-tile__arrow">→</span>
          </Link>
        ))}
        {usuari?.rol === 'ENCARREGAT' && (
          <>
            <Link to="/usuaris" className="card card--clickable nav-tile">
              <span className="nav-tile__icon">👥</span>
              Gestionar usuaris
              <span className="nav-tile__arrow">→</span>
            </Link>
            <Link to="/tasques-reten" className="card card--clickable nav-tile">
              <span className="nav-tile__icon">🔁</span>
              Tasques Reté
              <span className="nav-tile__arrow">→</span>
            </Link>
            <Link to="/tasques-quinzenals" className="card card--clickable nav-tile">
              <span className="nav-tile__icon">📅</span>
              Tasques Quinzenals
              <span className="nav-tile__arrow">→</span>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
