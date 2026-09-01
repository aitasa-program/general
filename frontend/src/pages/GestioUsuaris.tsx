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

  if (carregant) return <p>Carregant usuaris...</p>;

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Gestió d'usuaris</h1>
        <button onClick={() => setMostrarFormulari(!mostrarFormulari)}>
          {mostrarFormulari ? 'Cancel·lar' : '+ Nou usuari'}
        </button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {mostrarFormulari && (
        <form
          onSubmit={handleCrear}
          style={{ border: '1px solid #ddd', padding: 16, marginBottom: 20, maxWidth: 400 }}
        >
          <div style={{ marginBottom: 10 }}>
            <label>Nom</label>
            <input value={nom} onChange={(e) => setNom(e.target.value)} required style={{ width: '100%', padding: 6 }} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label>Nom d'usuari</label>
            <input
              value={nomUsuariNou}
              onChange={(e) => setNomUsuariNou(e.target.value)}
              required
              style={{ width: '100%', padding: 6 }}
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
              style={{ width: '100%', padding: 6 }}
            />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label>Rol</label>
            <select value={rol} onChange={(e) => setRol(e.target.value as any)} style={{ width: '100%', padding: 6 }}>
              <option value="TREBALLADOR">Treballador</option>
              <option value="ENCARREGAT">Encarregat</option>
            </select>
          </div>
          <button type="submit">Crear usuari</button>
        </form>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '2px solid #ddd' }}>
            <th style={{ padding: 8 }}>Nom</th>
            <th style={{ padding: 8 }}>Usuari</th>
            <th style={{ padding: 8 }}>Rol</th>
            <th style={{ padding: 8 }}>Estat</th>
            <th style={{ padding: 8 }}>Accions</th>
          </tr>
        </thead>
        <tbody>
          {usuaris.map((u) => (
            <tr key={u.id} style={{ borderBottom: '1px solid #eee', opacity: u.actiu ? 1 : 0.5 }}>
              <td style={{ padding: 8 }}>{u.nom}</td>
              <td style={{ padding: 8 }}>@{u.usuari}</td>
              <td style={{ padding: 8 }}>{u.rol === 'ENCARREGAT' ? 'Encarregat' : 'Treballador'}</td>
              <td style={{ padding: 8 }}>{u.actiu ? 'Actiu' : 'Inactiu'}</td>
              <td style={{ padding: 8 }}>
                <button onClick={() => obrirModalReset(u.id)} style={{ marginRight: 8 }}>
                  Restablir contrasenya
                </button>
                <button onClick={() => handleToggleActiu(u)} style={{ marginRight: 8 }}>
                  {u.actiu ? 'Desactivar' : 'Reactivar'}
                </button>
                {u.id !== usuariActual?.id && (
                  <button onClick={() => setModalEliminarId(u.id)} style={{ color: 'red' }}>
                    Eliminar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {modalResetId && (
        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginTop: 16, maxWidth: 320 }}>
          <p style={{ marginTop: 0 }}>Nova contrasenya</p>
          <form onSubmit={confirmarReset}>
            <input
              type="text"
              value={novaContrasenya}
              onChange={(e) => setNovaContrasenya(e.target.value)}
              placeholder="Mínim 6 caràcters"
              style={{ width: '100%', padding: 6, marginBottom: 8 }}
              autoFocus
            />
            {errorReset && <p style={{ color: 'red', fontSize: 13 }}>{errorReset}</p>}
            <button type="submit" style={{ marginRight: 8 }}>Confirmar</button>
            <button type="button" onClick={() => setModalResetId(null)}>Cancel·lar</button>
          </form>
        </div>
      )}

      {modalEliminarId && (
        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginTop: 16, maxWidth: 320 }}>
          <p>Eliminar aquest usuari? Aquesta acció no es pot desfer.</p>
          <button onClick={confirmarEliminar} style={{ color: 'red', marginRight: 8 }}>Sí, eliminar</button>
          <button onClick={() => setModalEliminarId(null)}>Cancel·lar</button>
        </div>
      )}
    </div>
  );
}
