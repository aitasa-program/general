import { FormEvent, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getUsuariActual } from '../services/api';
import { useVistaTreballador } from '../utils/vistaTreballador';
import { Carpeta, DocumentArxiu, carpetes, crearCarpeta, documents, pujarDocument, descarregarArxiu, errorArxiu } from '../services/arxiu';
import BotoTornar from '../components/BotoTornar';
import Icona from '../components/Icona';

export default function Documentacio() {
  const [vista] = useVistaTreballador();
  const admin = getUsuariActual()?.rol === 'ENCARREGAT' && !vista;
  const [params, setParams] = useSearchParams();
  const carpetaId = params.get('carpeta') || '';
  const [llista, setLlista] = useState<Carpeta[]>([]);
  const [files, setFiles] = useState<DocumentArxiu[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [novaCarpeta, setNovaCarpeta] = useState('');
  const [mostrarCarpeta, setMostrarCarpeta] = useState(false);
  const [nom, setNom] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const requestId = useRef('');
  const saving = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancel = false; setLoading(true); setError('');
    Promise.all([carpetes(), carpetaId ? documents(carpetaId, pagina) : Promise.resolve(null)]).then(([c, d]) => {
      if (cancel) return; setLlista(c); setFiles(d?.items || []); setTotal(d?.total || 0);
    }).catch(e => { if (!cancel) setError(errorArxiu(e)); }).finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, [carpetaId, pagina, revision]);

  function obrir(id: string) { setPagina(1); setParams(id ? { carpeta: id } : {}); setFile(null); setNom(''); setOk(''); }
  async function nova(e: FormEvent) {
    e.preventDefault(); if (saving.current) return; saving.current = true; setBusy(true); setError('');
    try { await crearCarpeta(novaCarpeta); setNovaCarpeta(''); setMostrarCarpeta(false); setRevision(r => r + 1); }
    catch (e) { setError(errorArxiu(e)); } finally { saving.current = false; setBusy(false); }
  }
  async function pujar(e: FormEvent) {
    e.preventDefault(); if (!file || saving.current) return;
    if (file.size > 10 * 1024 * 1024 || !file.size) { setError('Tria un fitxer de fins a 10 MB que no estigui buit.'); return; }
    saving.current = true; setBusy(true); setError(''); setOk('');
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader(); reader.onerror = () => reject(new Error('Lectura del fitxer fallida'));
        reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.readAsDataURL(file);
      });
      await pujarDocument({ id: requestId.current, carpetaId, nom, nomFitxer: file.name, base64 });
      setFile(null); setNom(''); if (fileInput.current) fileInput.current.value = '';
      setOk('Document guardat. Ja es pot consultar i descarregar.'); setPagina(1); setRevision(r => r + 1);
    } catch (e) { setError(errorArxiu(e)); } finally { saving.current = false; setBusy(false); }
  }
  async function baixar(d: DocumentArxiu) {
    setBusy(true); setError('');
    try { await descarregarArxiu(`/documentacio/documents/${d.id}/fitxer`, d.nomFitxer); }
    catch (e) { setError(errorArxiu(e)); } finally { setBusy(false); }
  }
  const carpeta = llista.find(c => c.id === carpetaId);
  return <div className="page archive-page"><BotoTornar /><h1>Documentació</h1><p className="page-subtitle">Documents de consulta organitzats per carpetes.</p>
    {error && <p role="alert" className="text-error">{error}</p>}{ok && <p role="status" className="text-success">{ok}</p>}
    {!carpetaId && <><div className="archive-heading"><h2>Carpetes</h2>{admin && <button onClick={() => setMostrarCarpeta(v => !v)}>+ Nova carpeta</button>}</div>
      {admin && mostrarCarpeta && <form className="card control-form" onSubmit={nova}><label htmlFor="nova-carpeta">Nom de la carpeta<input id="nova-carpeta" value={novaCarpeta} onChange={e => setNovaCarpeta(e.target.value)} required maxLength={120} /></label><button type="submit" disabled={busy}>Crear carpeta</button></form>}
      {loading ? <p role="status">Carregant carpetes…</p> : <div className="module-grid">{llista.map(c => <button className="module-card" key={c.id} onClick={() => obrir(c.id)}><Icona nom="folder" size={30} /><strong>{c.nom}</strong><span>{c._count.documents} documents</span></button>)}</div>}
    </>}
    {carpetaId && <><button className="back-link" disabled={busy} onClick={() => obrir('')}><Icona nom="back" size={16} />Totes les carpetes</button><h2>{carpeta?.nom || 'Carpeta'}</h2>
      {!loading && !carpeta && <p className="text-error">Carpeta no trobada.</p>}
      {admin && carpeta && <form className="card control-form" onSubmit={pujar}><h3>Afegir document</h3><label htmlFor="document-nom">Nom del document<input id="document-nom" value={nom} onChange={e => setNom(e.target.value)} required maxLength={180} disabled={busy} /></label>
        <label htmlFor="document-file">Fitxer<input ref={fileInput} id="document-file" type="file" accept=".pdf,.docx,.xlsx,.txt,.png,.jpg,.jpeg" required disabled={busy} onChange={e => { const f = e.target.files?.[0] || null; setFile(f); requestId.current = crypto.randomUUID(); if (f && !nom) setNom(f.name.replace(/\.[^.]+$/, '')); }} /></label>
        <p className="archive-note">PDF, Word (DOCX), Excel (XLSX), TXT o imatge. Màxim 10 MB. Cada pujada es conserva com un document nou.</p><button type="submit" disabled={busy || !file}>{busy ? 'Guardant…' : 'Guardar document'}</button>
      </form>}
      {loading ? <p role="status">Carregant documents…</p> : <>{!files.length && carpeta && <div className="card empty-state"><Icona nom="folder" size={30} /><p>Encara no hi ha documents en aquesta carpeta.</p></div>}
        <div className="archive-list">{files.map(d => <article className="card" key={d.id}><Icona nom="file" /><div><strong>{d.nom}</strong><p>{d.nomFitxer} · {(d.mida / 1024 / 1024).toLocaleString('ca-ES', { maximumFractionDigits: 2 })} MB</p><small>{new Date(d.creatEl).toLocaleDateString('ca-ES')} · {d.autorNom}</small></div><button disabled={busy} onClick={() => baixar(d)}>Descarregar</button></article>)}</div>
        {total > 30 && <div className="archive-pagination"><button disabled={pagina <= 1 || busy} onClick={() => setPagina(p => p - 1)}>Anterior</button><span>Pàgina {pagina} de {Math.ceil(total / 30)}</span><button disabled={pagina * 30 >= total || busy} onClick={() => setPagina(p => p + 1)}>Següent</button></div>}
      </>}
    </>}
  </div>;
}
