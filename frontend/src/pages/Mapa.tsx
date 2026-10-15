import { FormEvent, useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { capesMapa } from '../data/mapaAitasa';
import { api, getUsuariActual } from '../services/api';
import { useVistaTreballador } from '../utils/vistaTreballador';
import { errorArxiu } from '../services/arxiu';
import BotoTornar from '../components/BotoTornar';
import Icona from '../components/Icona';

function AjustaVista() {
  const map = useMap();
  useEffect(() => {
    const tots = capesMapa.flatMap(c => c.punts);
    if (tots.length) map.fitBounds(tots.map(p => [p.lat, p.lon] as [number, number]), { padding: [24, 24] });
  }, [map]);
  return null;
}

export default function Mapa() {
  const [vista] = useVistaTreballador();
  const admin = getUsuariActual()?.rol === 'ENCARREGAT' && !vista;
  const [actives, setActives] = useState<Record<string, boolean>>(() => Object.fromEntries(capesMapa.map(c => [c.id, true])));
  const [cerca, setCerca] = useState('');
  const [noms, setNoms] = useState<Record<string, string>>({});
  const [editant, setEditant] = useState<string | null>(null);
  const [valorEdit, setValorEdit] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/mapa/capes').then(r => setNoms(Object.fromEntries((r.data as { id: string; nom: string }[]).map(c => [c.id, c.nom])))).catch(() => {});
  }, []);

  function nomCapa(id: string, defecte: string) { return noms[id] || defecte; }
  function alternar(id: string) { setActives(prev => ({ ...prev, [id]: !prev[id] })); }
  function totes(valor: boolean) { setActives(Object.fromEntries(capesMapa.map(c => [c.id, valor]))); }
  function obrirEdicio(id: string, actual: string) { setEditant(id); setValorEdit(actual); setError(''); }
  async function desarNom(e: FormEvent, id: string) {
    e.preventDefault(); if (busy) return;
    const nom = valorEdit.trim(); if (!nom) return;
    setBusy(true); setError('');
    try { await api.patch(`/mapa/capes/${id}`, { nom }); setNoms(prev => ({ ...prev, [id]: nom })); setEditant(null); }
    catch (e) { setError(errorArxiu(e)); } finally { setBusy(false); }
  }

  const text = cerca.trim().toLowerCase();
  const capesVisibles = capesMapa.map(c => ({ ...c, nom: nomCapa(c.id, c.nom), punts: actives[c.id] ? c.punts.filter(p => !text || p.nom.toLowerCase().includes(text) || p.descripcio?.toLowerCase().includes(text)) : [] }));
  const totalVisible = capesVisibles.reduce((n, c) => n + c.punts.length, 0);

  return <div className="page mapa-page"><BotoTornar /><h1>Mapa</h1><p className="page-subtitle">Xarxes, pous i comptadors de la planta. Mostra o amaga cada zona i cerca un punt pel nom.</p>
    {error && <p role="alert" className="text-error">{error}</p>}
    <div className="mapa-layout">
      <div className="card mapa-sidebar">
        <label>Cercar un punt<input type="search" placeholder="Ex.: Arqueta 12, Pou 3…" value={cerca} onChange={e => setCerca(e.target.value)} /></label>
        <div style={{ display: 'flex', gap: 8, margin: '10px 0' }}>
          <button type="button" onClick={() => totes(true)}>Mostrar-les totes</button>
          <button type="button" onClick={() => totes(false)}>Amagar-les totes</button>
        </div>
        <ul className="mapa-capes">
          {capesMapa.map(c => {
            const nom = nomCapa(c.id, c.nom);
            return <li key={c.id}>
              {editant === c.id ? (
                <form onSubmit={e => desarNom(e, c.id)} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '6px 0' }}>
                  <span className="mapa-color" style={{ background: c.color }} />
                  <input autoFocus value={valorEdit} onChange={e => setValorEdit(e.target.value)} maxLength={120} style={{ flex: 1, minWidth: 0 }} />
                  <button type="submit" disabled={busy} style={{ fontSize: 12 }}>Desar</button>
                  <button type="button" style={{ fontSize: 12 }} onClick={() => setEditant(null)}>Cancel·lar</button>
                </form>
              ) : (
                <label className="inline-check">
                  <input type="checkbox" checked={actives[c.id]} onChange={() => alternar(c.id)} />
                  <span className="mapa-color" style={{ background: c.color }} />
                  {nom}<span className="text-muted" style={{ marginLeft: 'auto', fontSize: 12 }}>{c.punts.length}</span>
                  {admin && <button type="button" className="mapa-rename" aria-label={`Canviar el nom de ${nom}`} onClick={() => obrirEdicio(c.id, nom)}><Icona nom="note" size={14} /></button>}
                </label>
              )}
            </li>;
          })}
        </ul>
        <p className="text-muted" style={{ fontSize: 12 }}>{totalVisible} de {capesMapa.reduce((n, c) => n + c.punts.length, 0)} punts visibles</p>
      </div>
      <div className="mapa-mapa">
        <MapContainer center={[41.12, 1.19]} zoom={14} style={{ height: '100%', width: '100%' }}>
          <AjustaVista />
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
