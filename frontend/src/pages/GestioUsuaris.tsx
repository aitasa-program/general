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
import { Reten, llistarRetens, assignarReten, eliminarReten } from '../services/reten';
import { Quinzena, llistarQuinzenes, assignarQuinzena, eliminarQuinzena } from '../services/quinzena';
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

  const [retens, setRetens] = useState<Reten[]>([]);
  const [dataReten, setDataReten] = useState('');
  const [usuariReten, setUsuariReten] = useState('');
  const [errorReten, setErrorReten] = useState('');

  const [quinzenes, setQuinzenes] = useState<Quinzena[]>([]);
  const [dataQuinzena, setDataQuinzena] = useState('');
  const [usuariQuinzena, setUsuariQuinzena] = useState('');
  const [errorQuinzena, setErrorQuinzena] = useState('');

  async function carregar() {
    setCarregant(true);
    try {
      const [dades, dadesRetens, dadesQuinzenes] = await Promise.all([
        llistarUsuaris(),
        llistarRetens(),
        llistarQuinzenes(),
      ]);
      setUsuaris(dades);
      setRetens(dadesRetens);
      setQuinzenes(dadesQuinzenes);
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

  async function handleAssignarReten(e: React.FormEvent) {
    e.preventDefault();
    setErrorReten('');
    if (!dataReten || !usuariReten) {
      setErrorReten('Selecciona una data i un usuari');
      return;
    }
    try {
      await assignarReten(dataReten, usuariReten);
      setDataReten('');
      setUsuariReten('');
      carregar();
    } catch {
      setErrorReten('No s\'ha pogut assignar el reté');
    }
  }

  async function handleEliminarReten(id: string) {
    try {
      await eliminarReten(id);
      carregar();
    } catch {
      setErrorReten('No s\'ha pogut eliminar l\'assignació');
    }
  }

  async function handleAssignarQuinzena(e: React.FormEvent) {
    e.preventDefault();
    setErrorQuinzena('');
    if (!dataQuinzena || !usuariQuinzena) {
      setErrorQuinzena('Selecciona una data i un usuari');
      return;
    }
    try {
      await assignarQuinzena(dataQuinzena, usuariQuinzena);
      setDataQuinzena('');
      setUsuariQuinzena('');
      carregar();
    } catch {
      setErrorQuinzena('No s\'ha pogut assignar la quinzena');
    }
  }

  async function handleEliminarQuinzena(id: string) {
    try {
      await eliminarQuinzena(id);
      carregar();
    } catch {
      setErrorQuinzena('No s\'ha pogut eliminar l\'assignació');
    }
  }

  function etiquetaSetmana(setmanaInici: string) {
    const inici = new Date(setmanaInici);
    const fi = new Date(inici);
    fi.setDate(inici.getDate() + 6);
    return `${inici.toLocaleDateString('ca-ES')} – ${fi.toLocaleDateString('ca-ES')}`;
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

      <h2 style={{ marginTop: 40 }}>Reté setmanal</h2>
      <p className="text-muted" style={{ fontSize: 13, marginTop: -8 }}>
        El reté canvia cada dilluns a les 8:00. Tria qualsevol dia de la setmana que vulguis assignar.
      </p>

      <form onSubmit={handleAssignarReten} className="card" style={{ marginBottom: 20, maxWidth: 420 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <label>Data (qualsevol dia de la setmana)</label>
            <input type="date" value={dataReten} onChange={(e) => setDataReten(e.target.value)} style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 150 }}>
            <label>Usuari de reté</label>
            <select value={usuariReten} onChange={(e) => setUsuariReten(e.target.value)} style={{ width: '100%' }}>
              <option value="">Selecciona...</option>
              {usuaris.filter((u) => u.actiu).map((u) => (
                <option key={u.id} value={u.id}>{u.nom}</option>
              ))}
            </select>
          </div>
        </div>
        {errorReten && <p className="text-error" style={{ fontSize: 13 }}>{errorReten}</p>}
        <button type="submit" style={{ marginTop: 10 }}>Assignar reté</button>
      </form>

      {retens.length === 0 ? (
        <p className="text-muted">Encara no hi ha cap setmana de reté assignada.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {retens.map((r) => (
            <div
              key={r.id}
              className="card"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 420 }}
            >
              <span style={{ fontSize: 14 }}>
                <strong>{etiquetaSetmana(r.setmanaInici)}</strong>
                <br />
                <span className="text-muted">{r.usuari.nom}</span>
              </span>
              <button onClick={() => handleEliminarReten(r.id)} style={{ color: 'var(--c-error)' }}>
                Eliminar
              </button>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ marginTop: 40 }}>Quinzena setmanal</h2>
      <p className="text-muted" style={{ fontSize: 13, marginTop: -8 }}>
        Torn independent del reté (p. ex. una setmana ets reté, la següent de quinzena). Tria qualsevol dia de la setmana que vulguis assignar.
      </p>

      <form onSubmit={handleAssignarQuinzena} className="card" style={{ marginBottom: 20, maxWidth: 420 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <label>Data (qualsevol dia de la setmana)</label>
            <input type="date" value={dataQuinzena} onChange={(e) => setDataQuinzena(e.target.value)} style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 150 }}>
            <label>Usuari de quinzena</label>
            <select value={usuariQuinzena} onChange={(e) => setUsuariQuinzena(e.target.value)} style={{ width: '100%' }}>
              <option value="">Selecciona...</option>
              {usuaris.filter((u) => u.actiu).map((u) => (
                <option key={u.id} value={u.id}>{u.nom}</option>
              ))}
            </select>
          </div>
        </div>
        {errorQuinzena && <p className="text-error" style={{ fontSize: 13 }}>{errorQuinzena}</p>}
        <button type="submit" style={{ marginTop: 10 }}>Assignar quinzena</button>
      </form>

      {quinzenes.length === 0 ? (
        <p className="text-muted">Encara no hi ha cap setmana de quinzena assignada.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {quinzenes.map((q) => (
            <div
              key={q.id}
              className="card"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 420 }}
            >
              <span style={{ fontSize: 14 }}>
                <strong>{etiquetaSetmana(q.setmanaInici)}</strong>
                <br />
                <span className="text-muted">{q.usuari.nom}</span>
              </span>
              <button onClick={() => handleEliminarQuinzena(q.id)} style={{ color: 'var(--c-error)' }}>
                Eliminar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
