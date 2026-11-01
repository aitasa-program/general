import { FormEvent, useEffect, useMemo, useState } from 'react';
import { getUsuariActual } from '../services/api';
import { useVistaTreballador } from '../utils/vistaTreballador';
import { errorArxiu } from '../services/arxiu';
import {
  EquipManteniment,
  EstatManteniment as Estat,
  crearEquipManteniment,
  editarEquipManteniment,
  eliminarEquipManteniment,
  estatManteniment as estatEquip,
  llistarManteniment,
  marcarFetManteniment,
} from '../services/manteniment';
import BotoTornar from '../components/BotoTornar';
import Icona from '../components/Icona';

const MESOS = ['Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny', 'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre'];
const DIES_SETMANA = ['Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg'];

function inicioSetmana(d: Date) { const dt = new Date(d); const dow = (dt.getDay() + 6) % 7; dt.setDate(dt.getDate() - dow); dt.setHours(0, 0, 0, 0); return dt; }
function graellaDelMes(ancora: Date) { const primerDia = new Date(ancora.getFullYear(), ancora.getMonth(), 1); const inici = inicioSetmana(primerDia); return Array.from({ length: 42 }, (_, i) => { const d = new Date(inici); d.setDate(inici.getDate() + i); return d; }); }
function dataInput(d: Date) { const pad = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function mateixDia(a: string, b: Date) { return a === dataInput(b); }

const COLOR: Record<Estat, string> = { sense: '#b0b0b0', vençut: 'var(--c-error)', aviat: 'var(--c-warning)', aldia: 'var(--c-success)' };
const ETIQUETA: Record<Estat, string> = { sense: 'Sense periodicitat fixa', vençut: 'Vençut', aviat: 'Aviat', aldia: 'Al dia' };

const buit = { zona: '', part: '', reg: '', intern: true, extern: false, periodicitatText: '', periodicitatDies: '', mesExecucio: '', properaData: '', notes: '' };

export default function Manteniment() {
  const [vista] = useVistaTreballador();
  const admin = getUsuariActual()?.rol === 'ENCARREGAT' && !vista;
  const [equips, setEquips] = useState<EquipManteniment[]>([]);
  const [carregant, setCarregant] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const [vistaCal, setVistaCal] = useState(false);
  const [ancora, setAncora] = useState(new Date());
  const [diaSeleccionat, setDiaSeleccionat] = useState<Date | null>(null);
  const [cerca, setCerca] = useState('');
  const [nomesPendents, setNomesPendents] = useState(true);

  const [mostrarNou, setMostrarNou] = useState(false);
  const [form, setForm] = useState(buit);
  const [editantId, setEditantId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(buit);

  async function carregar() {
    setCarregant(true); setError('');
    try { setEquips(await llistarManteniment()); }
    catch (e) { setError(errorArxiu(e)); }
    finally { setCarregant(false); }
  }
  useEffect(() => { void carregar(); }, []);

  async function handleFet(id: string) {
    setBusy(id); setError(''); setOk('');
    try { await marcarFetManteniment(id); setOk('Marcat com a fet.'); await carregar(); }
    catch (e) { setError(errorArxiu(e)); }
    finally { setBusy(null); }
  }

  function aPayload(f: typeof buit) {
    return {
      zona: f.zona, part: f.part, reg: f.reg, intern: f.intern, extern: f.extern,
      periodicitatText: f.periodicitatText,
      periodicitatDies: f.periodicitatDies ? Number(f.periodicitatDies) : null,
      mesExecucio: f.mesExecucio ? Number(f.mesExecucio) : null,
      properaData: f.properaData || null,
      notes: f.notes,
    };
  }

  async function handleCrear(e: FormEvent) {
    e.preventDefault(); setError(''); setOk('');
    try { await crearEquipManteniment(aPayload(form)); setForm(buit); setMostrarNou(false); setOk('Equip afegit.'); await carregar(); }
    catch (e) { setError(errorArxiu(e)); }
  }
  function obrirEdicio(eq: EquipManteniment) {
    setEditantId(eq.id);
    setEditForm({
      zona: eq.zona, part: eq.part, reg: eq.reg, intern: eq.intern, extern: eq.extern,
      periodicitatText: eq.periodicitatText, periodicitatDies: eq.periodicitatDies ? String(eq.periodicitatDies) : '',
      mesExecucio: eq.mesExecucio ? String(eq.mesExecucio) : '', properaData: eq.properaData ? eq.properaData.slice(0, 10) : '',
      notes: eq.notes,
    });
  }
  async function handleGuardarEdicio(e: FormEvent) {
    e.preventDefault(); setError(''); setOk('');
    if (!editantId) return;
    try { await editarEquipManteniment(editantId, aPayload(editForm)); setEditantId(null); setOk('Canvis desats.'); await carregar(); }
    catch (e) { setError(errorArxiu(e)); }
  }
  async function handleDesactivar(eq: EquipManteniment) {
    setError(''); setOk('');
    try { await editarEquipManteniment(eq.id, { actiu: !eq.actiu }); await carregar(); }
    catch (e) { setError(errorArxiu(e)); }
  }
  async function handleEliminar(id: string) {
    if (!window.confirm('Segur que vols eliminar aquest equip del pla de manteniment? Aquesta acció no es pot desfer.')) return;
    setError(''); setOk('');
    try { await eliminarEquipManteniment(id); await carregar(); }
    catch (e) { setError(errorArxiu(e)); }
  }

  const text = cerca.trim().toLowerCase();
  const filtrats = useMemo(() => equips.filter(e =>
    (!text || `${e.zona} ${e.part}`.toLowerCase().includes(text)) &&
    (!nomesPendents || estatEquip(e) === 'vençut' || estatEquip(e) === 'aviat')
  ), [equips, text, nomesPendents]);

  const comptadors = { vençut: equips.filter(e => estatEquip(e) === 'vençut').length, aviat: equips.filter(e => estatEquip(e) === 'aviat').length };

  const diesVisibles = graellaDelMes(ancora);
  const delDiaSeleccionat = diaSeleccionat ? equips.filter(e => e.properaData && mateixDia(e.properaData.slice(0, 10), diaSeleccionat)) : [];

  if (carregant) return <p className="page text-muted">Carregant pla de manteniment...</p>;

  return (
    <div className="page archive-page">
      <BotoTornar />
      <h1>Manteniment</h1>
      <p className="page-subtitle">Pla de manteniment preventiu (P-12.01-R01): equips i zones a revisar, amb la seva periodicitat.</p>

      {(comptadors.vençut > 0 || comptadors.aviat > 0) && (
        <p className="text-muted" style={{ fontSize: 13, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {comptadors.vençut > 0 && <span style={{ color: 'var(--c-error)', fontWeight: 600 }}>{comptadors.vençut} vençuts</span>}
          {comptadors.aviat > 0 && <span style={{ color: 'var(--c-warning)', fontWeight: 600 }}>{comptadors.aviat} aviat</span>}
        </p>
      )}

      <div className="archive-heading">
        <span style={{ display: 'flex', gap: 8 }}>
          <button aria-pressed={!vistaCal} onClick={() => setVistaCal(false)}>Llista</button>
          <button aria-pressed={vistaCal} onClick={() => { setVistaCal(true); setDiaSeleccionat(null); }}>Calendari</button>
        </span>
        {admin && <button onClick={() => setMostrarNou(v => !v)}>{mostrarNou ? 'Cancel·lar' : '+ Nou equip'}</button>}
      </div>

      {error && <p role="alert" className="text-error">{error}</p>}
      {ok && <p role="status" className="text-success">{ok}</p>}

      {mostrarNou && (
        <form className="card control-form" onSubmit={handleCrear}>
          <h2>Nou equip</h2>
          <label>Zona / equip<input required maxLength={200} value={form.zona} onChange={e => setForm({ ...form, zona: e.target.value })} /></label>
          <label>Part / detall<input required maxLength={300} value={form.part} onChange={e => setForm({ ...form, part: e.target.value })} /></label>
          <label>Codi de referència (opcional)<input maxLength={40} value={form.reg} onChange={e => setForm({ ...form, reg: e.target.value })} /></label>
          <span style={{ display: 'flex', gap: 14 }}>
            <label className="inline-check"><input type="checkbox" checked={form.intern} onChange={e => setForm({ ...form, intern: e.target.checked })} />Manteniment intern</label>
            <label className="inline-check"><input type="checkbox" checked={form.extern} onChange={e => setForm({ ...form, extern: e.target.checked })} />Manteniment extern</label>
          </span>
          <label>Periodicitat (text, ex: "Trimestral")<input required maxLength={300} value={form.periodicitatText} onChange={e => setForm({ ...form, periodicitatText: e.target.value })} /></label>
          <label>Cada quants dies es repeteix (opcional, per calcular la propera data automàticament)<input type="number" min={1} value={form.periodicitatDies} onChange={e => setForm({ ...form, periodicitatDies: e.target.value })} /></label>
          <label>Mes fix de l'any (opcional, per manteniments externs anuals)<select value={form.mesExecucio} onChange={e => setForm({ ...form, mesExecucio: e.target.value })}><option value="">Sense mes fix</option>{MESOS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></label>
          <label>Propera data (opcional, se sobreescriu en marcar-lo fet)<input type="date" value={form.properaData} onChange={e => setForm({ ...form, properaData: e.target.value })} /></label>
          <label>Notes<textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></label>
          <button type="submit">Desar equip</button>
        </form>
      )}

      {!vistaCal && (
        <>
          <div className="card" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <label>Cercar<input type="search" value={cerca} onChange={e => setCerca(e.target.value)} placeholder="Zona o equip..." /></label>
            <label className="inline-check"><input type="checkbox" checked={nomesPendents} onChange={e => setNomesPendents(e.target.checked)} />Només vençuts o aviat</label>
          </div>
          <p className="text-muted" style={{ fontSize: 12, display: 'flex', gap: 14, alignItems: 'center', margin: '10px 0' }}>
            {(['vençut', 'aviat', 'aldia', 'sense'] as Estat[]).map(e => <span key={e}><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: COLOR[e], marginRight: 4 }} />{ETIQUETA[e]}</span>)}
          </p>
          <p>{filtrats.length} equips</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtrats.map(eq => {
              const estat = estatEquip(eq);
              return (
                <article className="card" key={eq.id} style={{ borderLeft: `4px solid ${COLOR[estat]}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <div><strong>{eq.zona}</strong><p className="text-muted" style={{ margin: '2px 0 0', fontSize: 13 }}>{eq.part}</p></div>
                    <span style={{ fontSize: 12, color: COLOR[estat], fontWeight: 600, whiteSpace: 'nowrap' }}>{ETIQUETA[estat]}</span>
                  </div>
                  <p className="text-muted" style={{ fontSize: 12, margin: '6px 0 0' }}>
                    {eq.periodicitatText}{eq.properaData && ` · Propera: ${eq.properaData.slice(0, 10).split('-').reverse().join('/')}`}
                    {eq.intern && ' · Intern'}{eq.extern && ' · Extern'}
                  </p>
                  {eq.ultimFet && <p className="text-muted" style={{ fontSize: 12, margin: '4px 0 0' }}>Últim cop fet: {new Date(eq.ultimFet.dataFet).toLocaleDateString('ca-ES')} per {eq.ultimFet.usuari.nom}</p>}
                  {eq.notes && <p className="text-muted" style={{ fontSize: 12, margin: '4px 0 0' }}>{eq.notes}</p>}
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    <button disabled={busy === eq.id} onClick={() => handleFet(eq.id)}>{busy === eq.id ? 'Desant…' : 'Marcar fet avui'}</button>
                    {admin && <>
                      <button onClick={() => editantId === eq.id ? setEditantId(null) : obrirEdicio(eq)}>{editantId === eq.id ? 'Cancel·lar' : 'Editar'}</button>
                      <button onClick={() => handleDesactivar(eq)}>{eq.actiu ? 'Desactivar' : 'Reactivar'}</button>
                      <button onClick={() => handleEliminar(eq.id)} style={{ color: 'var(--c-error)' }}>Eliminar</button>
                    </>}
                  </div>
                  {admin && editantId === eq.id && (
                    <form className="control-form" onSubmit={handleGuardarEdicio} style={{ marginTop: 10, borderTop: '1px solid var(--c-border)', paddingTop: 10 }}>
                      <label>Zona / equip<input required maxLength={200} value={editForm.zona} onChange={e => setEditForm({ ...editForm, zona: e.target.value })} /></label>
                      <label>Part / detall<input required maxLength={300} value={editForm.part} onChange={e => setEditForm({ ...editForm, part: e.target.value })} /></label>
                      <span style={{ display: 'flex', gap: 14 }}>
                        <label className="inline-check"><input type="checkbox" checked={editForm.intern} onChange={e => setEditForm({ ...editForm, intern: e.target.checked })} />Intern</label>
                        <label className="inline-check"><input type="checkbox" checked={editForm.extern} onChange={e => setEditForm({ ...editForm, extern: e.target.checked })} />Extern</label>
                      </span>
                      <label>Periodicitat (text)<input required maxLength={300} value={editForm.periodicitatText} onChange={e => setEditForm({ ...editForm, periodicitatText: e.target.value })} /></label>
                      <label>Cada quants dies<input type="number" min={1} value={editForm.periodicitatDies} onChange={e => setEditForm({ ...editForm, periodicitatDies: e.target.value })} /></label>
                      <label>Mes fix<select value={editForm.mesExecucio} onChange={e => setEditForm({ ...editForm, mesExecucio: e.target.value })}><option value="">Sense mes fix</option>{MESOS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></label>
                      <label>Propera data<input type="date" value={editForm.properaData} onChange={e => setEditForm({ ...editForm, properaData: e.target.value })} /></label>
                      <label>Notes<textarea value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} /></label>
                      <button type="submit">Desar canvis</button>
                    </form>
                  )}
                </article>
              );
            })}
            {!filtrats.length && <p className="text-muted">Cap equip amb aquests filtres.</p>}
          </div>
        </>
      )}

      {vistaCal && (
        <>
          <div className="calendar-toolbar">
            <button aria-label="Mes anterior" onClick={() => setAncora(new Date(ancora.getFullYear(), ancora.getMonth() - 1, 1))}>‹</button>
            <span className="calendar-toolbar__label">{MESOS[ancora.getMonth()]} {ancora.getFullYear()}</span>
            <button aria-label="Mes següent" onClick={() => setAncora(new Date(ancora.getFullYear(), ancora.getMonth() + 1, 1))}>›</button>
            <button onClick={() => { setAncora(new Date()); setDiaSeleccionat(new Date()); }}>Avui</button>
          </div>
          <div className="calendar-grid">
            {DIES_SETMANA.map(d => <div key={d} className="calendar-weekday">{d}</div>)}
            {diesVisibles.map((d, i) => {
              const delDia = equips.filter(e => e.properaData && mateixDia(e.properaData.slice(0, 10), d));
              const esDelMesActual = d.getMonth() === ancora.getMonth();
              const pitjor: Estat | null = delDia.length ? (delDia.some(e => estatEquip(e) === 'vençut') ? 'vençut' : delDia.some(e => estatEquip(e) === 'aviat') ? 'aviat' : 'aldia') : null;
              const classes = ['calendar-cell'];
              if (!esDelMesActual) classes.push('calendar-cell--muted');
              if (diaSeleccionat && mateixDia(dataInput(diaSeleccionat), d)) classes.push('calendar-cell--selected');
              return (
                <button type="button" key={i} className={classes.join(' ')} onClick={() => setDiaSeleccionat(diaSeleccionat && mateixDia(dataInput(diaSeleccionat), d) ? null : d)}>
                  <span>{d.getDate()}</span>
                  {pitjor && <div className="calendar-dots"><span className="calendar-dot" style={{ background: COLOR[pitjor] }} /></div>}
                </button>
              );
            })}
          </div>
          {diaSeleccionat && (
            <div style={{ marginTop: 14 }}>
              <p className="text-muted">{diaSeleccionat.toLocaleDateString('ca-ES', { weekday: 'long', day: 'numeric', month: 'long' })} — <button type="button" onClick={() => setDiaSeleccionat(null)} style={{ fontSize: 12 }}>Veure tot el mes</button></p>
              {delDiaSeleccionat.length === 0 ? <p className="text-muted">Cap equip programat aquest dia.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {delDiaSeleccionat.map(eq => (
                    <article className="card" key={eq.id}><strong>{eq.zona}</strong><p className="text-muted" style={{ fontSize: 13, margin: '2px 0 8px' }}>{eq.part} · {eq.periodicitatText}</p>
                      <button disabled={busy === eq.id} onClick={() => handleFet(eq.id)}>{busy === eq.id ? 'Desant…' : 'Marcar fet avui'}</button>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
