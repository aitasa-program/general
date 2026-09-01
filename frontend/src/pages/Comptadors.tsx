import { useEffect, useState } from 'react';
import { getUsuariActual } from '../services/api';
import {
  Comptador,
  ZonaComptador,
  crearComptador,
  crearZona,
  eliminarComptador,
  llistarComptadors,
  llistarZones,
} from '../services/comptadors';
import BotoTornar from '../components/BotoTornar';

const URL_APP_COMPTADORS = 'https://aplicaciocomptadors.aitasa.es/page/sign-in';

export default function Comptadors() {
  const usuariActual = getUsuariActual();
  const esEncarregat = usuariActual?.rol === 'ENCARREGAT';

  const [zones, setZones] = useState<ZonaComptador[]>([]);
  const [comptadors, setComptadors] = useState<Comptador[]>([]);
  const [carregant, setCarregant] = useState(true);
  const [error, setError] = useState('');

  const [zonaSeleccionada, setZonaSeleccionada] = useState<string | null>(null);

  const [mostrarNovaZona, setMostrarNovaZona] = useState(false);
  const [nomZona, setNomZona] = useState('');

  const [mostrarNouComptador, setMostrarNouComptador] = useState(false);
  const [nomComptador, setNomComptador] = useState('');

  async function carregar() {
    setCarregant(true);
    try {
      const [dadesZones, dadesComptadors] = await Promise.all([llistarZones(), llistarComptadors()]);
      setZones(dadesZones);
      setComptadors(dadesComptadors);
    } catch {
      setError('No s\'han pogut carregar els comptadors');
    } finally {
      setCarregant(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function handleCrearZona(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const nova = await crearZona(nomZona);
      setNomZona('');
      setMostrarNovaZona(false);
      setZones((prev) => [...prev, nova].sort((a, b) => a.nom.localeCompare(b.nom)));
    } catch {
      setError('No s\'ha pogut crear la zona (potser ja existeix)');
    }
  }

  async function handleCrearComptador(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!zonaSeleccionada) return;
    try {
      await crearComptador(nomComptador, zonaSeleccionada);
      setNomComptador('');
      setMostrarNouComptador(false);
      carregar();
    } catch {
      setError('No s\'ha pogut crear el comptador');
    }
  }

  async function handleEliminar(id: string) {
    try {
      await eliminarComptador(id);
      carregar();
    } catch {
      setError('No s\'ha pogut eliminar el comptador');
    }
  }

  if (carregant) return <p className="page text-muted">Carregant comptadors...</p>;

  const enllaçExtern = (
    <a
      href={URL_APP_COMPTADORS}
      target="_blank"
      rel="noopener noreferrer"
      className="card card--clickable"
      style={{ display: 'flex', alignItems: 'center', gap: 12, maxWidth: 480, marginBottom: 20 }}
    >
      <span style={{ fontSize: 24 }}>🔗</span>
      <div>
        <strong>Obrir aplicació de comptadors</strong>
        <p className="text-muted" style={{ margin: '2px 0 0', fontSize: 12 }}>
          Per fer i consultar les lectures reals, a aplicaciocomptadors.aitasa.es
        </p>
      </div>
    </a>
  );

  // --- Vista de detall d'una zona ---
  if (zonaSeleccionada) {
    const zona = zones.find((z) => z.id === zonaSeleccionada);
    const comptadorsDeLaZona = comptadors.filter((c) => c.zonaId === zonaSeleccionada);

    return (
      <div className="page">
        <BotoTornar />
        <button onClick={() => setZonaSeleccionada(null)} className="back-link" style={{ background: 'none', border: 'none', padding: 0, display: 'block' }}>
          ← Zones
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <h1>{zona?.nom}</h1>
          {esEncarregat && (
            <button onClick={() => setMostrarNouComptador(!mostrarNouComptador)}>
              {mostrarNouComptador ? 'Cancel·lar' : '+ Nou comptador'}
            </button>
          )}
        </div>

        {error && <p className="text-error">{error}</p>}

        {mostrarNouComptador && (
          <form onSubmit={handleCrearComptador} className="card" style={{ marginBottom: 20, maxWidth: 420 }}>
            <div style={{ marginBottom: 10 }}>
              <label>Nom del comptador</label>
              <input value={nomComptador} onChange={(e) => setNomComptador(e.target.value)} required style={{ width: '100%' }} />
            </div>
            <button type="submit">Crear comptador</button>
          </form>
        )}

        {comptadorsDeLaZona.length === 0 ? (
          <p className="text-muted">Cap comptador en aquesta zona encara.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {comptadorsDeLaZona.map((c) => (
              <div key={c.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 420 }}>
                <span>{c.nom}</span>
                {esEncarregat && (
                  <button onClick={() => handleEliminar(c.id)} style={{ color: 'var(--c-error)' }}>Eliminar</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- Vista principal: llista de zones ---
  return (
    <div className="page">
      <BotoTornar />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Comptadors</h1>
        {esEncarregat && (
          <button onClick={() => setMostrarNovaZona(!mostrarNovaZona)}>
            {mostrarNovaZona ? 'Cancel·lar' : '+ Nova zona'}
          </button>
        )}
      </div>

      {enllaçExtern}

      {error && <p className="text-error">{error}</p>}

      {mostrarNovaZona && (
        <form onSubmit={handleCrearZona} className="card" style={{ marginBottom: 20, maxWidth: 420 }}>
          <div style={{ marginBottom: 10 }}>
            <label>Nom de la zona o empresa (ex: Bonavista, Terciari, Torre...)</label>
            <input value={nomZona} onChange={(e) => setNomZona(e.target.value)} required style={{ width: '100%' }} />
          </div>
          <button type="submit">Crear zona</button>
        </form>
      )}

      {zones.length === 0 ? (
        <p className="text-muted">Encara no hi ha cap zona creada.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {zones.map((z) => {
            const total = comptadors.filter((c) => c.zonaId === z.id).length;
            return (
              <button
                key={z.id}
                onClick={() => setZonaSeleccionada(z.id)}
                className="card card--clickable"
                style={{ textAlign: 'left', maxWidth: 420, fontSize: 16, color: 'var(--c-text)' }}
              >
                {z.nom} <span className="text-muted" style={{ fontSize: 13 }}>({total} comptadors)</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
