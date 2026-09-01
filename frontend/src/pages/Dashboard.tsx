import { useEffect, useState } from 'react';
import { getUsuariActual, logout } from '../services/api';
import { useNavigate, Link } from 'react-router-dom';
import { RetenActual, obtenirRetenActual } from '../services/reten';
import { QuinzenaActual, obtenirQuinzenaActual } from '../services/quinzena';
import { QuinzenaBActual, obtenirQuinzenaBActual } from '../services/quinzenaB';

const enllacos = [
  { to: '/dia-a-dia', icon: '🗓️', label: 'Dia a dia' },
  { to: '/inventari', icon: '📦', label: 'Magatzem' },
  { to: '/comptadors', icon: '🔢', label: 'Comptadors' },
];

export default function Dashboard() {
  const usuari = getUsuariActual();
  const navigate = useNavigate();
  const [reten, setReten] = useState<RetenActual | null>(null);
  const [quinzena, setQuinzena] = useState<QuinzenaActual | null>(null);
  const [quinzenaB, setQuinzenaB] = useState<QuinzenaBActual | null>(null);

  useEffect(() => {
    obtenirRetenActual().then(setReten).catch(() => setReten(null));
    obtenirQuinzenaActual().then(setQuinzena).catch(() => setQuinzena(null));
    obtenirQuinzenaBActual().then(setQuinzenaB).catch(() => setQuinzenaB(null));
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link to="/recordatoris" style={{ fontSize: 13 }}>🔔 Recordatoris</Link>
          <button onClick={handleLogout}>Sortir</button>
        </div>
      </div>

      {reten && (
        <div className="card" style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>📞</span>
          <div>
            <p style={{ margin: 0, fontWeight: 700 }}>
              De retén aquesta setmana: {reten.usuari ? reten.usuari.nom : 'ningú assignat encara'}
            </p>
            <p className="text-muted" style={{ margin: '2px 0 0', fontSize: 12 }}>
              El retén canvia cada dilluns a les 8:00
              {quinzena?.usuari && <> · 🔁 Quinzena A: {quinzena.usuari.nom}</>}
              {quinzenaB?.usuari && <> · 🔂 Quinzena B: {quinzenaB.usuari.nom}</>}
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
            <Link to="/tasques-reten" className="card card--clickable nav-tile">
              <span className="nav-tile__icon">🔁</span>
              Tasques Retén
              <span className="nav-tile__arrow">→</span>
            </Link>
            <Link to="/tasques-quinzenals" className="card card--clickable nav-tile">
              <span className="nav-tile__icon">📅</span>
              Tasques Quinzenals A
              <span className="nav-tile__arrow">→</span>
            </Link>
            <Link to="/tasques-quinzenals-b" className="card card--clickable nav-tile">
              <span className="nav-tile__icon">📆</span>
              Tasques Quinzenals B
              <span className="nav-tile__arrow">→</span>
            </Link>
          </>
        )}
      </div>

      {usuari?.rol === 'ENCARREGAT' && (
        <div className="nav-grid" style={{ marginTop: 20 }}>
          <Link to="/usuaris" className="card card--clickable nav-tile">
            <span className="nav-tile__icon">👥</span>
            Gestionar usuaris
            <span className="nav-tile__arrow">→</span>
          </Link>
        </div>
      )}
    </div>
  );
}
