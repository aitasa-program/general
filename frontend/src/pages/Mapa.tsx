import { FormEvent, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { api, getUsuariActual } from '../services/api';
import { useVistaTreballador } from '../utils/vistaTreballador';
import { errorArxiu } from '../services/arxiu';
import BotoTornar from '../components/BotoTornar';
import Icona from '../components/Icona';

interface Punt { nom: string; descripcio?: string | null; lat: number; lon: number }
interface Capa { id: string; nom: string; color: string; punts: Punt[] }

function AjustaVista({ capes }: { capes: Capa[] }) {
  const map = useMap();
  useEffect(() => {
    const tots = capes.flatMap(c => c.punts);
    if (tots.length) map.fitBounds(tots.map(p => [p.lat, p.lon] as [number, number]), { padding: [24, 24] });
  }, [map, capes]);
  return null;
}

export default function Mapa() {
  const [vista] = useVistaTreballador();
  const admin = getUsuariActual()?.rol === 'ENCARREGAT' && !vista;
  const [capes, setCapes] = useState<Capa[]>([]);
  const [loading, setLoading] = useState(true);
  const [actives, setActives] = useState<Record<string, boolean>>({});
  const [cerca, setCerca] = useState('');
  const [editant, setEditant] = useState<string | null>(null);
  const [valorEdit, setValorEdit] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [mostrarImport, setMostrarImport] = useState(false);
  const [fitxer, setFitxer] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  function carregar() {
    setLoading(true); setError('');
    return api.get('/mapa/dades').then(r => {
      const dades = r.data as Capa[];
      setCapes(dades);
      setActives(prev => Object.fromEntries(dades.map(c => [c.id, prev[c.id] ?? true])));
    }).catch(e => setError(errorArxiu(e))).finally(() => setLoading(false));
  }
  useEffect(() => { void carregar(); }, []);

  function alternar(id: string) { setActives(prev => ({ ...prev, [id]: !prev[id] })); }
  function totes(valor: boolean) { setActives(Object.fromEntries(capes.map(c => [c.id, valor]))); }
  function obrirEdicio(id: string, actual: string) { setEditant(id); setValorEdit(actual); setError(''); }
  async function desarNom(e: FormEvent, id: string) {
    e.preventDefault(); if (busy) return;
    const nom = valorEdit.trim(); if (!nom) return;
    setBusy(true); setError('');
    try { await api.patch(`/mapa/capes/${id}`, { nom }); setCapes(prev => prev.map(c => c.id === id ? { ...c, nom } : c)); setEditant(null); }
    catch (e) { setError(errorArxiu(e)); } finally { setBusy(false); }
  }
  async function importar(e: FormEvent) {
    e.preventDefault(); if (!fitxer || busy) return;
    if (fitxer.size > 10 * 1024 * 1024 || !fitxer.size) { setError('Tria un fitxer KML de fins a 10 MB que no estigui buit.'); return; }
    setBusy(true); setError(''); setOk('');
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader(); reader.onerror = () => reject(new Error('Lectura del fitxer fallida'));
        reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.readAsDataURL(fitxer);
      });
      const r = await api.post('/mapa/importar', { base64 });
      setOk(`Mapa actualitzat: ${r.data.capes} capes, ${r.data.punts} punts.`);
      setFitxer(null); if (fileInput.current) fileInput.current.value = ''; setMostrarImport(false);
      await carregar();
    } catch (e) { setError(errorArxiu(e)); } finally { setBusy(false); }
  }

  const text = cerca.trim().toLowerCase();
  const capesVisibles = capes.map(c => ({ ...c, punts: actives[c.id] ? c.punts.filter(p => !text || p.nom.toLowerCase().includes(text) || p.descripcio?.toLowerCase().includes(text)) : [] }));
  const totalVisible = capesVisibles.reduce((n, c) => n + c.punts.length, 0);
  const totalPunts = capes.reduce((n, c) => n + c.punts.length, 0);

  return <div className="page mapa-page"><BotoTornar /><h1>Mapa</h1><p className="page-subtitle">Xarxes, pous i comptadors de la planta. Mostra o amaga cada zona i cerca un punt pel nom.</p>
    {error && <p role="alert" className="text-error">{error}</p>}{ok && <p role="status" className="text-success">{ok}</p>}
    {admin && <div className="card" style={{ marginBottom: 16 }}>
      {!mostrarImport ? (
        <button type="button" onClick={() => setMostrarImport(true)}>Actualitzar el mapa des d'un KML</button>
      ) : (
        <form onSubmit={importar} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <label style={{ flex: 1, minWidth: 220 }}>Fitxer KML exportat de Google Earth<input ref={fileInput} type="file" accept=".kml" required disabled={busy} onChange={e => setFitxer(e.target.files?.[0] || null)} /></label>
          <button type="submit" disabled={busy || !fitxer}>{busy ? 'Important…' : 'Importar i reemplaçar'}</button>
          <button type="button" disabled={busy} onClick={() => { setMostrarImport(false); setFitxer(null); }}>Cancel·lar</button>
        </form>
      )}
      <p className="text-muted" style={{ fontSize: 12, margin: '8px 0 0' }}>A Google Earth: Fitxer → Exporta → KML. En importar-lo aquí es reemplacen tots els punts pels del fitxer nou (es manté el nom que li hagis posat a cada capa).</p>
    </div>}
    <div className="mapa-layout">
      <div className="card mapa-sidebar">
        <label>Cercar un punt<input type="search" placeholder="Ex.: Arqueta 12, Pou 3…" value={cerca} onChange={e => setCerca(e.target.value)} /></label>
        <div style={{ display: 'flex', gap: 8, margin: '10px 0' }}>
          <button type="button" onClick={() => totes(true)}>Mostrar-les totes</button>
          <button type="button" onClick={() => totes(false)}>Amagar-les totes</button>
        </div>
        {loading ? <p role="status">Carregant…</p> : <ul className="mapa-capes">
          {capes.map(c => <li key={c.id}>
            {editant === c.id ? (
              <form onSubmit={e => desarNom(e, c.id)} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '6px 0' }}>
                <span className="mapa-color" style={{ background: c.color }} />
                <input autoFocus value={valorEdit} onChange={e => setValorEdit(e.target.value)} maxLength={120} style={{ flex: 1, minWidth: 0 }} />
                <button type="submit" disabled={busy} style={{ fontSize: 12 }}>Desar</button>
                <button type="button" style={{ fontSize: 12 }} onClick={() => setEditant(null)}>Cancel·lar</button>
              </form>
            ) : (
              <label className="inline-check">
                <input type="checkbox" checked={actives[c.id] ?? true} onChange={() => alternar(c.id)} />
                <span className="mapa-color" style={{ background: c.color }} />
                <span style={{ flex: 1 }}>{c.nom}</span>
                {admin && <button type="button" className="mapa-rename" aria-label={`Canviar el nom de ${c.nom}`} onClick={() => obrirEdicio(c.id, c.nom)}><Icona nom="note" size={14} /></button>}
              </label>
            )}
          </li>)}
        </ul>}
        <p className="text-muted" style={{ fontSize: 12 }}>{totalVisible} de {totalPunts} punts visibles</p>
      </div>
      <div className="mapa-mapa">
        <MapContainer center={[41.12, 1.19]} zoom={14} style={{ height: '100%', width: '100%' }}>
          <AjustaVista capes={capes} />
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {capesVisibles.map(c => c.punts.map((p, i) => (
            <CircleMarker key={c.id + i} center={[p.lat, p.lon]} radius={7} pathOptions={{ color: '#fff', weight: 1.5, fillColor: c.color, fillOpacity: 0.95 }}>
              <Popup><strong>{p.nom}</strong>{p.descripcio && <p style={{ margin: '4px 0 0' }}>{p.descripcio}</p>}<p className="text-muted" style={{ margin: '4px 0 0', fontSize: 11 }}>{c.nom}</p></Popup>
            </CircleMarker>
          )))}
        </MapContainer>
      </div>
    </div>
  </div>;
}
