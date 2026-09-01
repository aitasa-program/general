import { useEffect, useState } from 'react';
import {
  Usuari,
  llistarUsuaris,
  crearUsuari,
  canviarEstatActiu,
  restablirContrasenya,
  eliminarUsuari,
} from '../services/usuaris';
import { getUsuariActual } from '../services/api';
import BotoTornar from '../components/BotoTornar';

export default function GestioUsuaris() {
  const usuariActual = getUsuariActual();
  const [usuaris, setUsuaris] = useState<Usuari[]>([]);
  const [carregant, setCarregant] = useState(true);
  const [error, setError] = useState('');
  const [mostrarFormulari, setMostrarFormulari] = useState(false);

  const [nom, setNom] = useState('');
  const [nomUsuariNou, setNomUsuariNou] = useState('');
  const [contrasenya, setContrasenya] = useState('');
  const [rol, setRol] = useState<'TREBALLADOR' | 'ENCARREGAT'>('TREBALLADOR');

  const [modalResetId, setModalResetId] = useState<string | null>(null);
  const [novaContrasenya, setNovaContrasenya] = useState('');
  const [errorReset, setErrorReset] = useState('');
  const [modalEliminarId, setModalEliminarId] = useState<string | null>(null);

  async function carregar() {
    setCarregant(true);
    try {
      const dades = await llistarUsuaris();
      setUsuaris(dades);
    } catch {
      setError('No s\'han pogut carregar els usuaris');
    } finally {
      setCarregant(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await crearUsuari({ nom, usuari: nomUsuariNou.trim().toLowerCase(), contrasenya, rol });
      setNom('');
      setNomUsuariNou('');
      setContrasenya('');
      setRol('TREBALLADOR');
      setMostrarFormulari(false);
      carregar();
    } catch {
      setError('No s\'ha pogut crear l\'usuari (potser el nom d\'usuari ja existeix)');
    }
  }

  async function handleToggleActiu(usuari: Usuari) {
    try {
      await canviarEstatActiu(usuari.id, !usuari.actiu);
      carregar();
    } catch {
      setError('No s\'ha pogut canviar l\'estat de l\'usuari');
    }
  }

  function obrirModalReset(id: string) {
    setModalResetId(id);
    setNovaContrasenya('');
    setErrorReset('');
  }

  async function confirmarReset(e: React.FormEvent) {
    e.preventDefault();
    if (novaContrasenya.length < 6) {
      setErrorReset('La contrasenya ha de tenir almenys 6 caràcters');
      return;
    }
    try {
      await restablirContrasenya(modalResetId!, novaContrasenya);
      setModalResetId(null);
    } catch {
      setErrorReset('No s\'ha pogut restablir la contrasenya');
    }
  }

  async function confirmarEliminar() {
    if (!modalEliminarId) return;
    try {
      await eliminarUsuari(modalEliminarId);
      setModalEliminarId(null);
      carregar();
    } catch {
      setError('No es pot eliminar: aquest usuari té tasques o moviments associats. Desactiva\'l en lloc d\'eliminar-lo.');
      setModalEliminarId(null);
    }
  }

  if (carregant) return <p className="page text-muted">Carregant usuaris...</p>;

  return (
    <div className="page">
      <BotoTornar />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Gestió d'usuaris</h1>
        <button onClick={() => setMostrarFormulari(!mostrarFormulari)}>
          {mostrarFormulari ? 'Cancel·lar' : '+ Nou usuari'}
        </button>
      </div>

      {error && <p className="text-error">{error}</p>}

      {mostrarFormulari && (
        <form onSubmit={handleCrear} className="card" style={{ marginBottom: 20, maxWidth: 400 }}>
          <div style={{ marginBottom: 10 }}>
            <label>Nom</label>
            <input value={nom} onChange={(e) => setNom(e.target.value)} required style={{ width: '100%' }} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label>Nom d'usuari</label>
            <input
              value={nomUsuariNou}
              onChange={(e) => setNomUsuariNou(e.target.value)}
              required
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label>Contrasenya inicial</label>
            <input
              type="password"
              value={contrasenya}
              onChange={(e) => setContrasenya(e.target.value)}
              required
              minLength={6}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label>Rol</label>
            <select value={rol} onChange={(e) => setRol(e.target.value as any)} style={{ width: '100%' }}>
              <option value="TREBALLADOR">Treballador</option>
              <option value="ENCARREGAT">Encarregat</option>
            </select>
          </div>
          <button type="submit">Crear usuari</button>
        </form>
      )}

      <div style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th>Nom</th>
            <th>Usuari</th>
            <th>Rol</th>
            <th>Estat</th>
            <th>Accions</th>
          </tr>
        </thead>
        <tbody>
          {usuaris.map((u) => (
            <tr key={u.id} style={{ opacity: u.actiu ? 1 : 0.5 }}>
              <td>{u.nom}</td>
              <td>@{u.usuari}</td>
              <td>{u.rol === 'ENCARREGAT' ? 'Encarregat' : 'Treballador'}</td>
              <td>{u.actiu ? 'Actiu' : 'Inactiu'}</td>
              <td>
                <button onClick={() => obrirModalReset(u.id)} style={{ marginRight: 8 }}>
                  Restablir contrasenya
                </button>
                <button onClick={() => handleToggleActiu(u)} style={{ marginRight: 8 }}>
                  {u.actiu ? 'Desactivar' : 'Reactivar'}
                </button>
                {u.id !== usuariActual?.id && (
                  <button onClick={() => setModalEliminarId(u.id)} style={{ color: 'var(--c-error)' }}>
                    Eliminar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      {modalResetId && (
        <div className="card" style={{ marginTop: 16, maxWidth: 320 }}>
          <p style={{ marginTop: 0 }}>Nova contrasenya</p>
          <form onSubmit={confirmarReset}>
            <input
              type="text"
              value={novaContrasenya}
              onChange={(e) => setNovaContrasenya(e.target.value)}
              placeholder="Mínim 6 caràcters"
              style={{ width: '100%', marginBottom: 8 }}
              autoFocus
            />
            {errorReset && <p className="text-error" style={{ fontSize: 13 }}>{errorReset}</p>}
            <button type="submit" style={{ marginRight: 8 }}>Confirmar</button>
            <button type="button" onClick={() => setModalResetId(null)}>Cancel·lar</button>
          </form>
        </div>
      )}

      {modalEliminarId && (
        <div className="card" style={{ marginTop: 16, maxWidth: 320 }}>
          <p>Eliminar aquest usuari? Aquesta acció no es pot desfer.</p>
          <button onClick={confirmarEliminar} style={{ color: 'var(--c-error)', marginRight: 8 }}>Sí, eliminar</button>
          <button onClick={() => setModalEliminarId(null)}>Cancel·lar</button>
        </div>
      )}
    </div>
  );
}
