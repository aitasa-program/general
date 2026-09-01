import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/api';

export default function Login() {
  const [nomUsuari, setNomUsuari] = useState('');
  const [contrasenya, setContrasenya] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await login(nomUsuari.trim().toLowerCase(), contrasenya);
      navigate('/');
    } catch {
      setError('Nom d\'usuari o contrasenya incorrectes');
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="card" style={{ maxWidth: 360, width: '100%', padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <img src="/logo.png" alt="AITASA" style={{ maxWidth: 200, width: '100%' }} />
        </div>
        <h2 style={{ textAlign: 'center', marginTop: 0 }}>Accés</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label>Nom d'usuari</label>
            <input
              type="text"
              value={nomUsuari}
              onChange={(e) => setNomUsuari(e.target.value)}
              style={{ width: '100%' }}
              required
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label>Contrasenya</label>
            <input
              type="password"
              value={contrasenya}
              onChange={(e) => setContrasenya(e.target.value)}
              style={{ width: '100%' }}
              required
            />
          </div>
          {error && <p className="text-error" style={{ fontSize: 13 }}>{error}</p>}
          <button type="submit" style={{ width: '100%', padding: 12, fontSize: 15 }}>
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
