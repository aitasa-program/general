import { useEffect, useState } from 'react';
import { getUsuariActual } from '../services/api';
import { Checklist, marcarItem, llistarChecklistComptadors } from '../services/checklists';
import {
  Comptador,
  TipusAigua,
  TIPUS_AIGUA,
  actualitzarTipusComptador,
  ZonaComptador,
  crearComptador,
  crearZona,
  eliminarComptador,
  eliminarZona,
  llistarComptadors,
  llistarZones,
  sincronitzarChecklistComptadors,
} from '../services/comptadors';
import BotoTornar from '../components/BotoTornar';
import { errorArxiu } from '../services/arxiu';

const URL_APP_COMPTADORS = 'https://aplicaciocomptadors.aitasa.es/page/sign-in';

export default function Comptadors() {
  const usuariActual = getUsuariActual();
  const esEncarregat = usuariActual?.rol === 'ENCARREGAT';

  const [zones, setZones] = useState<ZonaComptador[]>([]);
  const [comptadors, setComptadors] = useState<Comptador[]>([]);
  const [checklistsMapa, setChecklistsMapa] = useState<Checklist[]>([]);
  const [carregant, setCarregant] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const [zonaSeleccionada, setZonaSeleccionada] = useState<string | null>(null);

  const [mostrarNovaZona, setMostrarNovaZona] = useState(false);
  const [nomZona, setNomZona] = useState('');

  const [mostrarNouComptador, setMostrarNouComptador] = useState(false);
  const [nomComptador, setNomComptador] = useState('');
  const [tipusNouComptador, setTipusNouComptador] = useState<TipusAigua | ''>('');
  const [sincronitzant, setSincronitzant] = useState(false);
  const [marcantItem, setMarcantItem] = useState<string | null>(null);

  async function carregar() {
    setCarregant(true);
    try {
      const [dadesZones, dadesComptadors] = await Promise.all([llistarZones(), llistarComptadors()]);
      setZones(dadesZones);
      setComptadors(dadesComptadors);
      try {
        let llistes = await llistarChecklistComptadors();
        setChecklistsMapa(llistes);
        if (llistes.length < 5 && navigator.onLine) {
          await sincronitzarChecklistComptadors();
          llistes = await llistarChecklistComptadors();
          setChecklistsMapa(llistes);
        }
      } catch (e) {
        setError(`No s’ha pogut carregar el checklist del mapa: ${errorArxiu(e)}`);
      }
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

  async function handleEliminarZona(zona: ZonaComptador) {
    const totalComptadors = comptadors.filter((c) => c.zonaId === zona.id).length;
    if (totalComptadors > 0) {
      setError(`No es pot eliminar «${zona.nom}» perquè encara conté ${totalComptadors} comptadors. Elimina’ls primer.`);
      setOk('');
      return;
    }
    if (!window.confirm(`Segur que vols eliminar la zona «${zona.nom}»?`)) return;
    setError(''); setOk('');
    try {
      await eliminarZona(zona.id);
      setZones((prev) => prev.filter((z) => z.id !== zona.id));
      setOk(`Zona «${zona.nom}» eliminada.`);
    } catch (e) {
      setError(errorArxiu(e));
    }
  }

  async function handleCrearComptador(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setOk('');
    if (!zonaSeleccionada) return;
    try {
      await crearComptador(nomComptador, zonaSeleccionada, tipusNouComptador || undefined);
      setNomComptador('');
      setTipusNouComptador('');
      setMostrarNouComptador(false);
      setOk('Comptador creat al directori.');
      carregar();
    } catch (e) {
      setError(errorArxiu(e));
    }
  }

  async function handleCanviarTipus(id: string, tipusAigua: TipusAigua | null) {
    setError(''); setOk('');
    try {
      const actualitzat = await actualitzarTipusComptador(id, tipusAigua);
      setComptadors((prev) => prev.map((c) => c.id === id ? actualitzat : c));
      setOk('Tipus d’aigua del directori actualitzat.');
    } catch (e) {
      setError(errorArxiu(e));
    }
  }

  async function handleSincronitzarChecklists() {
    setError(''); setOk(''); setSincronitzant(true);
    try {
      const resultat = await sincronitzarChecklistComptadors();
      setChecklistsMapa(await llistarChecklistComptadors());
      setOk(`Checklists actualitzades amb ${resultat.totalPunts} punts del mapa. ${resultat.senseClassificar} pendents de classificar.`);
    } catch (e) {
      setError(errorArxiu(e));
    } finally {
      setSincronitzant(false);
    }
  }

  async function handleMarcarPunt(id: string) {
    if (marcantItem) return;
    setMarcantItem(id); setError('');
    try {
      const resposta = await marcarItem(id, true);
      const actualitzat = (resposta as typeof resposta & { queued?: boolean }).queued ? null : resposta;
      setChecklistsMapa((prev) => prev.map((checklist) => ({
        ...checklist,
        items: checklist.items.map((item) => item.id === id ? {
          ...item,
          ...(actualitzat || {}),
          marcat: true,
          completatPerNom: actualitzat?.completatPerNom || usuariActual?.nom || 'Tu',
          completatEl: actualitzat?.completatEl || new Date().toISOString(),
        } : item),
      })));
    } catch (e) {
      setError(errorArxiu(e));
    } finally {
      setMarcantItem(null);
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
              <label>Tipus d’aigua</label>
              <select value={tipusNouComptador} onChange={(e) => setTipusNouComptador(e.target.value as TipusAigua | '')} required style={{ width: '100%' }}>
                <option value="">Selecciona un tipus...</option>
                {TIPUS_AIGUA.map((tipus) => <option key={tipus.value} value={tipus.value}>{tipus.label}</option>)}
              </select>
            </div>
            <button type="submit">Crear comptador</button>
          </form>
        )}

        {comptadorsDeLaZona.length === 0 ? (
          <p className="text-muted">Cap comptador en aquesta zona encara.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {comptadorsDeLaZona.map((c) => (
              <div key={c.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span>{c.nom}</span>
                {esEncarregat ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <select aria-label={`Tipus d’aigua de ${c.nom}`} value={c.tipusAigua || ''} onChange={(e) => handleCanviarTipus(c.id, (e.target.value || null) as TipusAigua | null)}>
                      <option value="">Sense classificar</option>
                      {TIPUS_AIGUA.map((tipus) => <option key={tipus.value} value={tipus.value}>{tipus.label}</option>)}
                    </select>
                    <button onClick={() => handleEliminar(c.id)} style={{ color: 'var(--c-error)' }}>Eliminar</button>
                  </div>
                ) : (
                  <span className="text-muted">{TIPUS_AIGUA.find((tipus) => tipus.value === c.tipusAigua)?.label || 'Sense classificar'}</span>
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
      {ok && <p className="text-success">{ok}</p>}

      <section className="card" style={{ width: '100%', marginBottom: 20 }}>
        <h2 style={{ marginTop: 0 }}>Checklist de control</h2>
        <p className="text-muted">Tots els punts de la capa COMPTADORS del mapa. Quan importis un KML nou, el checklist s’actualitzarà automàticament. La marca queda registrada amb el nom i l’hora, i després no es pot desfer des de cap compte.</p>
        {esEncarregat && <button type="button" onClick={handleSincronitzarChecklists} disabled={sincronitzant}>
          {sincronitzant ? 'Actualitzant…' : 'Sincronitzar checklist des del mapa'}
        </button>}
        {checklistsMapa.length === 0 ? <p className="text-muted">Encara no hi ha punts a la capa COMPTADORS del mapa.</p> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginTop: 16 }}>
            {[...checklistsMapa].sort((a, b) => {
              const ordre = ['XARXA_INDUSTRIAL', 'XARXA_REGENERADA', 'XARXA_CLORADA', 'TRACTAMENT_CONJUNT', 'SENSE_CLASSIFICAR'];
              return ordre.indexOf(a.origenComptadors || '') - ordre.indexOf(b.origenComptadors || '');
            }).map((checklist) => (
              <section key={checklist.id} className="card" style={{ width: '100%' }}>
                <h3 style={{ marginTop: 0 }}>{checklist.nom.replace('Comptadors · ', '')} <span className="text-muted">({checklist.items.filter((item) => item.marcat).length}/{checklist.items.length})</span></h3>
                {checklist.items.length === 0 ? <p className="text-muted">No hi ha comptadors en aquest grup.</p> : (
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {checklist.items.map((item) => (
                      <li key={item.id} style={{ borderBottom: '1px solid var(--c-border)', paddingBottom: 7 }}>
                        <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <input type="checkbox" checked={item.marcat} disabled={item.marcat || marcantItem !== null} onChange={() => void handleMarcarPunt(item.id)} />
                          <span style={{ textDecoration: item.marcat ? 'line-through' : 'none', color: item.marcat ? 'var(--c-text-muted)' : 'inherit' }}>{item.text}</span>
                        </label>
                        {item.marcat && <small className="text-muted" style={{ display: 'block', marginLeft: 24 }}>
                          Fet per {item.completatPerNom || 'usuari anterior'}{item.completatEl ? ` · ${new Date(item.completatEl).toLocaleString('ca-ES')}` : ''}
                        </small>}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}
      </section>

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
            const total = comptadors.filter((c) => c.zonaId === z.id).length;
            return (
              <div key={z.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
                <button
                  onClick={() => setZonaSeleccionada(z.id)}
                  className="card--clickable"
                  style={{ textAlign: 'left', flex: 1, border: 0, background: 'transparent', padding: 0, fontSize: 16, color: 'var(--c-text)' }}
                >
                  {z.nom} <span className="text-muted" style={{ fontSize: 13 }}>({total} comptadors)</span>
                </button>
                {esEncarregat && <button type="button" onClick={() => handleEliminarZona(z)} aria-label={`Eliminar zona ${z.nom}`} style={{ color: 'var(--c-error)' }}>Eliminar</button>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
