import { useEffect, useState } from 'react';
import { getUsuariActual } from '../services/api';
import {
  Comptador,
  ZonaComptador,
  crearComptador,
  crearZona,
  editarComptador,
  eliminarComptador,
  llistarComptadors,
  llistarZones,
  marcarLlegitComptador,
} from '../services/comptadors';
import BotoTornar from '../components/BotoTornar';
import { errorArxiu } from '../services/arxiu';

const URL_APP_COMPTADORS = 'https://aplicaciocomptadors.aitasa.es/page/sign-in';
const TIPUS_SUGGERITS = ['Potable', 'Regenerada', 'Industrial', 'Residual'];
const SENSE_TIPUS = 'Sense tipus indicat';
function agruparPerTipus(comptadors: Comptador[]): [string, Comptador[]][] {
  const grups = new Map<string, Comptador[]>();
  for (const c of comptadors) {
    const clau = c.tipusAigua || SENSE_TIPUS;
    grups.set(clau, [...(grups.get(clau) || []), c]);
  }
  return [...grups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export default function Comptadors() {
  const usuariActual = getUsuariActual();
  const esEncarregat = usuariActual?.rol === 'ENCARREGAT';

  const [zones, setZones] = useState<ZonaComptador[]>([]);
  const [comptadors, setComptadors] = useState<Comptador[]>([]);
  const [carregant, setCarregant] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const [zonaSeleccionada, setZonaSeleccionada] = useState<string | null>(null);

  const [mostrarNovaZona, setMostrarNovaZona] = useState(false);
  const [nomZona, setNomZona] = useState('');

  const [mostrarNouComptador, setMostrarNouComptador] = useState(false);
  const [nomComptador, setNomComptador] = useState('');
  const [tipusComptador, setTipusComptador] = useState('');

  const [editantId, setEditantId] = useState<string | null>(null);
  const [editNom, setEditNom] = useState('');
  const [editTipus, setEditTipus] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

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
    setError(''); setOk('');
    try {
      const nova = await crearZona(nomZona);
      setNomZona('');
      setMostrarNovaZona(false);
      setZones((prev) => [...prev, nova].sort((a, b) => a.nom.localeCompare(b.nom)));
      setOk('Zona creada.');
    } catch (e) {
      setError(errorArxiu(e));
    }
  }

  async function handleCrearComptador(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setOk('');
    if (!zonaSeleccionada) return;
    try {
      await crearComptador(nomComptador, zonaSeleccionada, tipusComptador);
      setNomComptador('');
      setTipusComptador('');
      setMostrarNouComptador(false);
      setOk('Comptador creat.');
      carregar();
    } catch (e) {
      setError(errorArxiu(e));
    }
  }

  function obrirEdicio(c: Comptador) {
    setEditantId(editantId === c.id ? null : c.id);
    setEditNom(c.nom);
    setEditTipus(c.tipusAigua);
  }

  async function handleGuardarEdicio(e: React.FormEvent, c: Comptador) {
    e.preventDefault();
    setError(''); setOk('');
    try {
      await editarComptador(c.id, editNom, c.zonaId, editTipus);
      setEditantId(null);
      setOk('Comptador actualitzat.');
      carregar();
    } catch (e) {
      setError(errorArxiu(e));
    }
  }

  async function handleToggleLlegit(c: Comptador) {
    setError(''); setOk(''); setBusyId(c.id);
    try {
      await marcarLlegitComptador(c.id, !c.llegit);
      carregar();
    } catch (e) {
      setError(errorArxiu(e));
    } finally {
      setBusyId(null);
    }
  }

  async function handleEliminar(id: string) {
    if (!window.confirm('Segur que vols eliminar aquest comptador? Aquesta acció no es pot desfer.')) return;
    setError(''); setOk('');
    try {
      await eliminarComptador(id);
      carregar();
    } catch (e) {
      setError(errorArxiu(e));
    }
  }

  if (carregant) return <p className="page text-muted">Carregant comptadors...</p>;

  const enllaçExtern = (
    <a
      href={URL_APP_COMPTADORS}
      target="_blank"
      rel="noopener noreferrer"
      className="card card--clickable"
      style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', marginBottom: 20 }}
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
        {ok && <p className="text-success">{ok}</p>}

        {mostrarNouComptador && (
          <form onSubmit={handleCrearComptador} className="card" style={{ marginBottom: 20, width: '100%' }}>
            <div style={{ marginBottom: 10 }}>
              <label>Nom del comptador</label>
              <input value={nomComptador} onChange={(e) => setNomComptador(e.target.value)} required style={{ width: '100%' }} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label>Tipus d'aigua (opcional)</label>
              <input list="tipus-aigua-suggerits" value={tipusComptador} onChange={(e) => setTipusComptador(e.target.value)} style={{ width: '100%' }} />
              <datalist id="tipus-aigua-suggerits">{TIPUS_SUGGERITS.map((t) => <option key={t} value={t} />)}</datalist>
            </div>
            <button type="submit">Crear comptador</button>
          </form>
        )}

        {comptadorsDeLaZona.length === 0 ? (
          <p className="text-muted">Cap comptador en aquesta zona encara.</p>
        ) : esEncarregat ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {comptadorsDeLaZona.map((c) => (
              <div key={c.id} className="card" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span>{c.nom}{c.tipusAigua && <span className="text-muted" style={{ fontSize: 12 }}> · {c.tipusAigua}</span>}</span>
                  <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button disabled={busyId === c.id} onClick={() => handleToggleLlegit(c)} className={c.llegit ? 'text-success' : 'text-error'} style={{ fontSize: 12 }}>
                      {c.llegit ? '✓ Llegit' : 'Pendent'}
                    </button>
                    <button onClick={() => obrirEdicio(c)} style={{ fontSize: 12 }}>{editantId === c.id ? 'Cancel·lar' : 'Editar'}</button>
                    <button onClick={() => handleEliminar(c.id)} style={{ color: 'var(--c-error)', fontSize: 12 }}>Eliminar</button>
                  </span>
                </div>
                {editantId === c.id && (
                  <form onSubmit={(e) => handleGuardarEdicio(e, c)} style={{ borderTop: '1px solid var(--c-border)', marginTop: 10, paddingTop: 10 }}>
                    <div style={{ marginBottom: 8 }}>
                      <label>Nom</label>
                      <input value={editNom} onChange={(e) => setEditNom(e.target.value)} required style={{ width: '100%' }} />
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <label>Tipus d'aigua</label>
                      <input list="tipus-aigua-suggerits" value={editTipus} onChange={(e) => setEditTipus(e.target.value)} style={{ width: '100%' }} />
                    </div>
                    <button type="submit">Desar canvis</button>
                  </form>
                )}
              </div>
            ))}
          </div>
        ) : (
          (() => {
            const pendents = comptadorsDeLaZona.filter((c) => !c.llegit);
            if (pendents.length === 0) return <p className="text-success">Tots els comptadors d'aquesta zona estan llegits.</p>;
            return <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {agruparPerTipus(pendents).map(([tipus, llista]) => (
                <div key={tipus}>
                  <h3 style={{ fontSize: 14, margin: '0 0 8px' }}>{tipus} <span className="text-muted">({llista.length} pendents)</span></h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {llista.map((c) => (
                      <div key={c.id} className="card" style={{ width: '100%' }}>{c.nom}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>;
          })()
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
      {ok && <p className="text-success">{ok}</p>}

      {mostrarNovaZona && (
        <form onSubmit={handleCrearZona} className="card" style={{ marginBottom: 20, width: '100%' }}>
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
            const delaZona = comptadors.filter((c) => c.zonaId === z.id);
            const pendents = delaZona.filter((c) => !c.llegit).length;
            return (
              <button
                key={z.id}
                onClick={() => setZonaSeleccionada(z.id)}
                className="card card--clickable"
                style={{ textAlign: 'left', width: '100%', fontSize: 16, color: 'var(--c-text)' }}
              >
                {z.nom} <span className="text-muted" style={{ fontSize: 13 }}>({delaZona.length} comptadors{pendents > 0 ? ` · ${pendents} pendents` : ''})</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
