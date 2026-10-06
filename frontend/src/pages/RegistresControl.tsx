import { FormEvent, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getUsuariActual } from '../services/api';
import { useVistaTreballador } from '../utils/vistaTreballador';
import { CampControl, PlantillaControl, RegistreControl, crearPlantilla, editarPlantilla, plantillesControl, registresControl, obtenirControl, desarControl, descarregarArxiu, diaLocal, errorArxiu } from '../services/arxiu';
import { Formulari, llistarFormularis } from '../services/formularis';
import BotoTornar from '../components/BotoTornar';
import Icona from '../components/Icona';
import ControlsSetmanals from '../components/ControlsSetmanals';

const nouCamp = (): CampControl => ({ nom: '', tipus: 'text', obligatori: true, nomesEncarregat: false });
const formatDia = (s: string) => s.split('-').reverse().join('/');

export default function RegistresControl() {
  const user = getUsuariActual();
  const [vista] = useVistaTreballador();
  const admin = user?.rol === 'ENCARREGAT' && !vista;
  const [params] = useSearchParams();
  const [tab, setTab] = useState<'setmanals' | 'emplenar' | 'arxiu' | 'plantilles'>('setmanals');
  const [plantilles, setPlantilles] = useState<PlantillaControl[]>([]);
  const [antics, setAntics] = useState<Formulari[]>([]);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [loading, setLoading] = useState(true);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [dia, setDia] = useState(params.get('dia') || diaLocal());
  const [oberta, setOberta] = useState<PlantillaControl | null>(null);
  const [valors, setValors] = useState<Record<string, string>>({});
  const [peticio, setPeticio] = useState('');
  const [original, setOriginal] = useState<RegistreControl | null>(null);
  const [motiu, setMotiu] = useState('');
  const [guardat, setGuardat] = useState<RegistreControl | null>(null);
  const [detall, setDetall] = useState<RegistreControl | null>(null);
  const [registres, setRegistres] = useState<RegistreControl[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [desDe, setDesDe] = useState('');
  const [fins, setFins] = useState('');
  const [filtre, setFiltre] = useState('');
  const [edicio, setEdicio] = useState<PlantillaControl | null>(null);
  const [editor, setEditor] = useState(false);
  const [nom, setNom] = useState('');
  const [camps, setCamps] = useState<CampControl[]>([nouCamp()]);
  const [activa, setActiva] = useState(true);

  async function carregarPlantilles() { setPlantilles(await plantillesControl()); }
  useEffect(() => {
    let cancel = false;
    plantillesControl().then(p => { if (!cancel) setPlantilles(p); }).catch(e => { if (!cancel) setError(errorArxiu(e)); }).finally(() => { if (!cancel) setLoading(false); });
    if (admin) llistarFormularis().then(p => { if (!cancel) setAntics(p); }).catch(() => {});
    return () => { cancel = true; };
  }, [admin]);
  useEffect(() => {
    if (tab !== 'arxiu') return;
    let cancel = false; setArchiveLoading(true); setError('');
    registresControl({ pagina, ...(desDe ? { desDe } : {}), ...(fins ? { fins } : {}), ...(filtre ? { plantillaId: filtre } : {}) })
      .then(r => { if (!cancel) { setRegistres(r.items); setTotal(r.total); } })
      .catch(e => { if (!cancel) setError(errorArxiu(e)); }).finally(() => { if (!cancel) setArchiveLoading(false); });
    return () => { cancel = true; };
  }, [tab, pagina, desDe, fins, filtre]);
  useEffect(() => {
    if (detall) document.getElementById('control-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [detall]);

  function obrir(p: PlantillaControl, r?: RegistreControl) {
    setOberta(p); setValors(r?.valors || {}); setPeticio(crypto.randomUUID()); setOriginal(r || null);
    setMotiu(''); setError(''); setOk(''); setGuardat(null); setDetall(null); setTab('emplenar');
    if (r) setDia(r.dia);
  }
  async function guardar(e: FormEvent) {
    e.preventDefault(); if (!oberta || saving.current) return;
    saving.current = true; setBusy(true); setError('');
    try {
      const r = await desarControl({ id: peticio, plantillaId: oberta.id, versio: oberta.versio, dia, valors, ...(original ? { rectificaId: original.id, motiu } : {}) });
      setGuardat(r); setOberta(null); setOriginal(null); setOk('Registre i PDF guardats a l’arxiu.');
    } catch (e) { setError(errorArxiu(e)); } finally { saving.current = false; setBusy(false); }
  }
  async function pdf(r: RegistreControl) {
    setBusy(true); setError('');
    try { await descarregarArxiu(`/controls/registres/${r.id}/pdf`, `control-${r.dia}-${r.id}.pdf`); }
    catch (e) { setError(errorArxiu(e)); } finally { setBusy(false); }
  }
  async function veure(id: string) {
    setError(''); setBusy(true);
    try { setDetall(await obtenirControl(id)); } catch (e) { setError(errorArxiu(e)); } finally { setBusy(false); }
  }
  function editar(p?: PlantillaControl) {
    setEdicio(p || null); setNom(p?.nom || ''); setCamps(p?.camps.map(c => ({ ...c })) || [nouCamp()]); setActiva(p?.activa ?? true); setEditor(true); setError('');
  }
  async function guardarPlantilla(e: FormEvent) {
    e.preventDefault(); if (saving.current) return; saving.current = true; setBusy(true); setError('');
    try {
      const data = { nom, camps: camps.map(c => ({ ...c, ...(c.tipus === 'seleccio' ? { opcions: c.opcions?.map(v => v.trim()).filter(Boolean) } : {}) })) };
      if (edicio) await editarPlantilla(edicio.id, { ...data, activa, versio: edicio.versio }); else await crearPlantilla(data);
      await carregarPlantilles(); setEditor(false); setOk('Plantilla guardada. Els registres anteriors es conserven.');
    } catch (e) { setError(errorArxiu(e)); } finally { saving.current = false; setBusy(false); }
  }
  function camp(i: number, patch: Partial<CampControl>) { setCamps(prev => prev.map((c, n) => n === i ? { ...c, ...patch } : c)); }

  return <div className="page archive-page"><BotoTornar /><h1>Registres de control</h1>
    <p className="page-subtitle">Emplena els controls de cada dia i consulta els PDF guardats.</p>
    <div className="archive-tabs" aria-label="Seccions dels registres">
      <button aria-pressed={tab === 'setmanals'} onClick={() => setTab('setmanals')}>Controls setmanals</button>
      <button aria-pressed={tab === 'emplenar'} onClick={() => { setTab('emplenar'); setDetall(null); }}>Emplenar control</button>
      <button aria-pressed={tab === 'arxiu'} onClick={() => { setTab('arxiu'); setDetall(null); }}>Arxiu de registres</button>
      {admin && <button aria-pressed={tab === 'plantilles'} onClick={() => setTab('plantilles')}>Gestionar formularis</button>}
    </div>
    {error && <p role="alert" className="text-error">{error}</p>}
    {ok && <p role="status" className="text-success">{ok}</p>}
    <div hidden={tab !== 'setmanals'}><ControlsSetmanals diaInicial={dia} /></div>
    {tab === 'emplenar' && <>
      {guardat && <div className="card archive-success"><Icona nom="file" /><div><strong>{guardat.nom}</strong><p>Control del {formatDia(guardat.dia)} · {guardat.autorNom}</p></div><button disabled={busy} onClick={() => pdf(guardat)}>Descarregar PDF</button></div>}
      <div className="archive-filters"><label htmlFor="control-dia">Dia del control<input id="control-dia" type="date" value={dia} onChange={e => setDia(e.target.value)} required disabled={busy} /></label></div>
      {!oberta && <>{loading ? <p role="status">Carregant formularis…</p> : <div className="module-grid">{plantilles.filter(p => p.activa).map(p => <button className="module-card" key={p.id} onClick={() => obrir(p)}><Icona nom="file" size={26} /><strong>{p.nom}</strong><span>{p.camps.length} camps · Versió {p.versio}</span><span>Emplenar →</span></button>)}</div>}
        {!loading && !plantilles.some(p => p.activa) && <div className="card empty-state"><h3>Encara no hi ha formularis de control</h3><p>{admin ? 'Crea el primer formulari amb els camps que cal registrar.' : 'Un administrador ha de preparar els formularis.'}</p>{admin && <button onClick={() => { setTab('plantilles'); editar(); }}>Crear formulari</button>}</div>}</>}
      {oberta && <form className="card control-form" onSubmit={guardar}><div className="archive-heading"><h2>{oberta.nom}</h2><button type="button" disabled={busy} onClick={() => { setOberta(null); setOriginal(null); }}>Tancar</button></div>
        <p className="text-muted">Versió {oberta.versio} · {formatDia(dia)} · {user?.nom}</p>
        {original && <label htmlFor="rectificacio-motiu">Motiu de la rectificació<textarea id="rectificacio-motiu" required maxLength={1000} value={motiu} onChange={e => setMotiu(e.target.value)} /></label>}
        {oberta.camps.map((c, i) => { const bloquejat = c.nomesEncarregat && !admin; return <label key={i} htmlFor={`control-${i}`}>{c.nom}{bloquejat ? ' (només un encarregat ho pot editar)' : c.obligatori ? ' *' : ' (opcional)'}
          {c.tipus === 'seleccio' ? <select id={`control-${i}`} required={c.obligatori && !bloquejat} disabled={bloquejat} value={valors[c.nom] || ''} onChange={e => setValors({ ...valors, [c.nom]: e.target.value })}><option value="">Selecciona…</option>{c.opcions?.map((v, n) => <option key={n} value={v}>{v}</option>)}</select>
          : c.tipus === 'multilinia' ? <textarea id={`control-${i}`} required={c.obligatori && !bloquejat} disabled={bloquejat} maxLength={5000} rows={3} value={valors[c.nom] || ''} onChange={e => setValors({ ...valors, [c.nom]: e.target.value })} />
          : <input id={`control-${i}`} type={c.tipus === 'numero' ? 'number' : c.tipus === 'data' ? 'date' : 'text'} step={c.tipus === 'numero' ? 'any' : undefined} maxLength={5000} required={c.obligatori && !bloquejat} disabled={bloquejat} value={valors[c.nom] || ''} onChange={e => setValors({ ...valors, [c.nom]: e.target.value })} />}
        </label>; })}
        <p className="archive-note">Es guardarà una còpia del formulari amb el teu nom i la data de registre. Si cal corregir-lo, podràs fer una rectificació conservant l’original.</p>
        <button type="submit" disabled={busy || !dia}>{busy ? 'Desant registre i PDF…' : 'Desar registre i PDF'}</button>
      </form>}
    </>}
    {tab === 'arxiu' && <>
      <div className="archive-filters"><label>Des de<input type="date" value={desDe} onChange={e => { setDesDe(e.target.value); setPagina(1); }} /></label><label>Fins a<input type="date" value={fins} onChange={e => { setFins(e.target.value); setPagina(1); }} /></label><label>Formulari<select value={filtre} onChange={e => { setFiltre(e.target.value); setPagina(1); }}><option value="">Tots els formularis</option>{plantilles.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}</select></label></div>
      {archiveLoading ? <p role="status">Carregant arxiu…</p> : <><p className="text-muted">{total} registres guardats</p><div className="archive-list">{registres.map(r => <article className="card" key={r.id}><div><strong>{r.nom}</strong><p>{formatDia(r.dia)} · {r.autorNom}</p><small>{r.rectificacio ? 'Rectificat · Es conserva l’original' : r.rectificaId ? 'Rectificació' : 'Arxivat'} · Versió {r.versio}</small></div><div className="archive-actions"><button disabled={busy} onClick={() => veure(r.id)}>Veure registre</button><button disabled={busy} onClick={() => pdf(r)}>PDF</button></div></article>)}</div><div className="archive-pagination"><button disabled={pagina <= 1 || busy} onClick={() => setPagina(p => p - 1)}>Anterior</button><span>Pàgina {pagina} de {Math.max(1, Math.ceil(total / 30))}</span><button disabled={pagina * 30 >= total || busy} onClick={() => setPagina(p => p + 1)}>Següent</button></div></>}
      {detall && <section id="control-detail" className="card control-detail" aria-label="Detall del registre"><div className="archive-heading"><h2>{detall.nom}</h2><button onClick={() => setDetall(null)}>Tancar detall</button></div><p>{formatDia(detall.dia)} · {detall.autorNom}</p><p className="text-muted">Guardat el {new Date(detall.creatEl).toLocaleString('ca-ES', { timeZone: 'Europe/Madrid' })} (hora de Madrid)</p>
        <dl>{detall.camps.map(c => <div key={c.nom}><dt>{c.nom}</dt><dd>{detall.valors[c.nom] || '—'}</dd></div>)}</dl>
        {detall.motiu && <p><strong>Motiu:</strong> {detall.motiu}</p>}
        <div className="archive-actions"><button disabled={busy} onClick={() => pdf(detall)}>Descarregar PDF</button>{detall.rectificaId && <button disabled={busy} onClick={() => veure(detall.rectificaId!)}>Veure original</button>}{detall.rectificacio && <button disabled={busy} onClick={() => veure(detall.rectificacio!.id)}>Veure rectificació</button>}
          {!detall.rectificacio && (admin || detall.autorId === user?.id) && <button disabled={busy} onClick={() => obrir({ id: detall.plantillaId, nom: detall.nom, camps: detall.camps, versio: detall.versio, activa: true }, detall)}>Rectificar</button>}
        </div><details><summary>Identificació del document</summary><p className="archive-hash">ID: {detall.id}<br />SHA-256: {detall.sha256}</p></details>
      </section>}
    </>}
    {tab === 'plantilles' && admin && <>
      <div className="archive-heading"><h2>Formularis de control</h2><button onClick={() => editar()}>+ Nou formulari</button></div>
      <p className="text-muted">Els canvis creen una versió nova. Arxivar una plantilla no elimina els controls guardats.</p>
      {editor && <form className="card control-form" onSubmit={guardarPlantilla}>
        <h3>{edicio ? 'Editar formulari' : 'Nou formulari'}</h3>
        {!edicio && antics.length > 0 && <label>Copiar un formulari existent<select defaultValue="" onChange={e => { const f = antics.find(f => f.id === e.target.value); if (f) { setNom(f.nom); setCamps(f.camps.map(c => ({ ...c, obligatori: true, nomesEncarregat: false }))); } }}><option value="">Començar en blanc</option>{antics.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}</select></label>}
        <label htmlFor="plantilla-nom">Nom del formulari<input id="plantilla-nom" value={nom} required maxLength={180} onChange={e => setNom(e.target.value)} /></label>
        {camps.map((c, i) => <fieldset className="field-editor" key={i}><legend>Camp {i + 1}</legend><label>Nom del camp<input value={c.nom} required maxLength={120} onChange={e => camp(i, { nom: e.target.value })} /></label><label>Tipus<select value={c.tipus} onChange={e => camp(i, { tipus: e.target.value as CampControl['tipus'] })}><option value="text">Text curt</option><option value="multilinia">Observacions / text llarg</option><option value="numero">Número</option><option value="seleccio">Desplegable</option><option value="data">Data</option></select></label>
          {c.tipus === 'seleccio' && <label>Opcions (una per línia)<textarea value={c.opcions?.join('\n') || ''} required onChange={e => camp(i, { opcions: e.target.value.split('\n') })} /></label>}
          <label className="inline-check"><input type="checkbox" checked={c.obligatori} onChange={e => camp(i, { obligatori: e.target.checked })} />Obligatori</label>
          <label className="inline-check"><input type="checkbox" checked={c.nomesEncarregat} onChange={e => camp(i, { nomesEncarregat: e.target.checked })} />Només ho pot editar un encarregat</label>
          <button type="button" disabled={camps.length === 1} onClick={() => setCamps(camps.filter((_, n) => n !== i))}>Treure camp</button>
        </fieldset>)}
        <button type="button" disabled={camps.length >= 40} onClick={() => setCamps([...camps, nouCamp()])}>+ Afegir camp</button>
        {edicio && <label className="inline-check"><input type="checkbox" checked={activa} onChange={e => setActiva(e.target.checked)} />Plantilla activa</label>}
        <div className="archive-actions"><button type="submit" disabled={busy}>{busy ? 'Desant…' : 'Desar formulari'}</button><button type="button" disabled={busy} onClick={() => setEditor(false)}>Cancel·lar</button></div>
      </form>}
      <div className="archive-list">{plantilles.map(p => <article className="card" key={p.id}><div><strong>{p.nom}</strong><p>Versió {p.versio} · {p.activa ? 'Activa' : 'Arxivada'} · {p.camps.length} camps</p></div><button onClick={() => editar(p)}>Editar</button></article>)}</div>
    </>}
  </div>;
}
