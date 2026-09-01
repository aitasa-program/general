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
    <div style={{ maxWidth: 360, margin: '80px auto', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <img src="/logo.png" alt="AITASA" style={{ maxWidth: 220, width: '100%' }} />
      </div>
      <h2>Accés</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>Nom d'usuari</label>
          <input
            type="text"
            value={nomUsuari}
            onChange={(e) => setNomUsuari(e.target.value)}
            style={{ width: '100%', padding: 8 }}
            required
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Contrasenya</label>
          <input
            type="password"
            value={contrasenya}
            onChange={(e) => setContrasenya(e.target.value)}
            style={{ width: '100%', padding: 8 }}
            required
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" style={{ width: '100%', padding: 10 }}>
          Entrar
        </button>
      </form>
    </div>
  );
}
