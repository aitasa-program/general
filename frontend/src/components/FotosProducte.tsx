import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { errorArxiu } from '../services/arxiu';

interface Foto { id: string; nom: string }
function Imatge({ producteId, foto }: { producteId: string; foto: Foto }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true, objectUrl = '';
    api.get(`/fotos-productes/${producteId}/${foto.id}`, { responseType: 'blob' }).then(r => {
      if (!active) return;
      objectUrl = URL.createObjectURL(r.data); setUrl(objectUrl);
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [producteId, foto.id]);
  return url ? <a href={url} target="_blank" rel="noreferrer" aria-label={`Ampliar ${foto.nom}`}><img src={url} alt={foto.nom} style={{ width: 140, height: 110, objectFit: 'contain', borderRadius: 8, background: '#f1f6fa' }}/></a> : <span>{error ? 'No s’ha pogut carregar la foto' : 'Carregant foto…'}</span>;
}

export default function FotosProducte({ producteId, admin }: { producteId: string; admin: boolean }) {
  const [obert, setObert] = useState(false);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [esborrar, setEsborrar] = useState<string|null>(null);
  async function carregar() { const r = await api.get(`/fotos-productes/${producteId}`); setFotos(r.data); }
  useEffect(() => { if (obert) { setBusy(true); carregar().catch(e => setError(errorArxiu(e))).finally(() => setBusy(false)); } }, [obert, producteId]);
  async function afegir(files: File[]) {
    setError('');
    if (files.length + fotos.length > 10) { setError('Màxim 10 fotos per producte'); return; }
    if (files.some(f => f.size > 10*1024*1024 || !['image/jpeg','image/png','image/webp'].includes(f.type))) { setError('Selecciona fotos JPG, PNG o WebP de fins a 10 MB'); return; }
    setBusy(true);
    try { for (const file of files) await api.post(`/fotos-productes/${producteId}/${crypto.randomUUID()}`, file, { params: { nom: file.name.slice(0,180) }, headers: { 'Content-Type': file.type } }); }
    catch(e) { setError(errorArxiu(e)); }
    finally { try { await carregar(); } catch(e) { setError(errorArxiu(e)); } setBusy(false); }
  }
  async function eliminar(id: string) {
    setBusy(true); setError('');
    try { await api.delete(`/fotos-productes/${producteId}/${id}`); setFotos(prev => prev.filter(f => f.id !== id)); setEsborrar(null); }
    catch(e) { setError(errorArxiu(e)); } finally { setBusy(false); }
  }
  return <section style={{ marginTop: 10 }} aria-label="Fotos del producte">
    <button type="button" onClick={() => setObert(!obert)} aria-expanded={obert}>{obert ? 'Amagar fotos' : 'Fotos'}</button>
    {obert && <div style={{ marginTop: 10 }}>
      {error && <p role="alert" className="text-error">{error}</p>}
      {busy && <p role="status">Processant fotos…</p>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>{fotos.map(f => <div key={f.id} style={{ width: 150, overflowWrap: 'anywhere' }}>
        <Imatge producteId={producteId} foto={f}/><small style={{ display: 'block' }}>{f.nom}</small>
        {admin && (esborrar === f.id ? <><span>Eliminar aquesta foto?</span><button disabled={busy} onClick={() => eliminar(f.id)}>Sí, eliminar</button><button disabled={busy} onClick={() => setEsborrar(null)}>Cancel·lar</button></> : <button disabled={busy} onClick={() => setEsborrar(f.id)}>Eliminar foto</button>)}
      </div>)}</div>
      {!busy && !fotos.length && <p className="text-muted">Aquest producte encara no té fotos.</p>}
      {admin && <label style={{ display: 'block', marginTop: 12 }}>Afegir fotos<input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy||fotos.length>=10} onChange={e => { const files = Array.from(e.target.files || []); e.target.value = ''; if(files.length) void afegir(files); }}/><small>JPG, PNG o WebP · Fins a 10 fotos de 10 MB. Pots ampliar-les prement la imatge.</small></label>}
    </div>}
  </section>;
}
