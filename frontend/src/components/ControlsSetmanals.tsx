import { FormEvent, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { descarregarArxiu, diaLocal, errorArxiu } from '../services/arxiu';

interface Camp { key: string; label: string; tipus: 'text' | 'numero' | 'hora' | 'seleccio'; opcions?: string[] }
interface Model { id: string; nom: string; titol: string; instruccions: string; grups: { nom: string; camps: Camp[] }[]; organoleptics: Camp[]; notaOrg: string; notaAnomalies: string }
interface Fila { id: string; dia: string; lloc: string; valors: Record<string,string>; operari?: string }
interface Dades { lectures: Fila[]; organoleptics: Fila[]; anomalies: string; observacions: string; operaris?: string[] }
interface Revisio { id: string; versio: number; autorNom: string; creatEl: string; motiu?: string; sha256: string }
interface Full { versio: number; dades: Dades; historial: Revisio[]; total: number; revisionId: string | null }
function dilluns(dia: string) { const d=new Date(dia+'T12:00:00Z'); d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7); return d.toISOString().slice(0,10); }
function moure(dia: string, dies: number) {const d=new Date(dia+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+dies);return d.toISOString().slice(0,10);}
const data = (dia: string) => dia.split('-').reverse().join('/');
function prepararFiles(d:Dades, places:string[]):Dades {
  const rows=[...d.organoleptics];
  for(const day of d.lectures) for(const place of places) if(!rows.some(r=>r.dia===day.dia&&r.lloc===place)) rows.push({id:crypto.randomUUID(),dia:day.dia,lloc:place,valors:{}});
  return {...d,organoleptics:rows};
}
const llocs:Record<string,string[]>={'xarxa-clorada':['Sortida Dipòsit','Repsol Tanques','BASF PTP','CLARIANT'],'clor-tc8':['TC-8 A'],dupont:['Dupont']};
const dies = ['Dl','Dt','Dc','Dj','Dv','Ds','Dg'];

export default function ControlsSetmanals({ diaInicial }: { diaInicial?: string }) {
  const initial = /^\d{4}-\d{2}-\d{2}$/.test(diaInicial || '') && !isNaN(new Date(diaInicial!+'T12:00:00Z').getTime()) ? diaInicial! : diaLocal();
  const [models,setModels]=useState<Model[]>([]);
  const [tipus,setTipus]=useState('xarxa-clorada');
  const [setmana,setSetmana]=useState(dilluns(initial));
  const [dia,setDia]=useState(initial);
  const [full,setFull]=useState<Full|null>(null);
  const [dades,setDades]=useState<Dades|null>(null);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const saving=useRef(false);
  const [dirty,setDirty]=useState(false);
  const [error,setError]=useState('');
  const [ok,setOk]=useState('');
  const [motiu,setMotiu]=useState('');
  const [peticio,setPeticio]=useState('');
  const [reload,setReload]=useState(0);
  const [pagina,setPagina]=useState(1);
  const [seccio,setSeccio]=useState<'lectures'|'org'|'notes'>('lectures');
  const model=models.find(m=>m.id===tipus);
  useEffect(()=>{api.get('/controls/setmanals/models').then(r=>setModels(r.data)).catch(e=>setError(errorArxiu(e)));},[]);
  useEffect(()=>{
    let cancel=false;setLoading(true);setError('');
    api.get(`/controls/setmanals/${tipus}/${setmana}`,{params:{pagina}}).then(r=>{
      if(cancel)return;setFull(r.data);setDades(prepararFiles(r.data.dades,llocs[tipus]));setDirty(false);setMotiu('');setPeticio(crypto.randomUUID());
    }).catch(e=>{if(!cancel)setError(errorArxiu(e));}).finally(()=>{if(!cancel)setLoading(false);});
    return()=>{cancel=true;};
  },[tipus,setmana,reload,pagina]);
  useEffect(()=>{if(!dirty)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
  function canviar(next: Dades){setDades(next);setDirty(true);setOk('');setPeticio(crypto.randomUUID());}
  function setmanaNova(value:string){if(!value)return;setSetmana(dilluns(value));setDia(value);setPagina(1);setOk('');}
  function lectura(key:string,value:string){if(!dades)return;canviar({...dades,lectures:dades.lectures.map(f=>f.dia===dia?{...f,valors:{...f.valors,[key]:value}}:f)});}
  function org(index:number,patch:Partial<Fila>){if(!dades)return;canviar({...dades,organoleptics:dades.organoleptics.map((f,i)=>i===index?{...f,...patch}:f)});}
  async function guardar(e:FormEvent){
    e.preventDefault();if(!dades||!full||saving.current)return;saving.current=true;setBusy(true);setError('');setOk('');
    try{await api.post(`/controls/setmanals/${tipus}/${setmana}`,{id:peticio,versio:full.versio,dades:{...dades,organoleptics:dades.organoleptics.filter(f=>Object.values(f.valors).some(v=>v.trim()))},...(motiu.trim()?{motiu:motiu.trim()}:{})});setDirty(false);setOk('Setmana guardada. El PDF inclou totes les dades desades fins ara.');setReload(n=>n+1);}
    catch(e){setError(errorArxiu(e));}finally{saving.current=false;setBusy(false);}
  }
  async function pdf(id:string,versio:number){setBusy(true);setError('');try{await descarregarArxiu(`/controls/setmanals/pdf/${id}`,`${tipus}-${setmana}-v${versio}.pdf`);}catch(e){setError(errorArxiu(e));}finally{setBusy(false);}}
  function input(c:Camp,value:string,onChange:(s:string)=>void,prefix:string){
    const id=`${prefix}-${c.key}`;
    return <label key={c.key} htmlFor={id}>{c.label}{c.tipus==='seleccio'?<select id={id} value={value} onChange={e=>onChange(e.target.value)}><option value="">Sense registrar</option>{c.opcions?.map(o=><option key={o}>{o}</option>)}</select>:<input id={id} type={c.tipus==='hora'?'time':c.tipus==='numero'?'number':'text'} step={c.tipus==='numero'?'any':undefined} maxLength={1000} value={value} onChange={e=>onChange(e.target.value)} />}</label>;
  }
  const selected=dades?.lectures.find(f=>f.dia===dia);
  return <section className="weekly-controls" aria-label="Controls setmanals">
    <p className="text-muted">Un mateix full per a tota la setmana. Completa-la cada dia i descarrega el PDF quan el necessitis.</p>
    <div className="archive-tabs">{models.map(m=><button disabled={dirty||busy} key={m.id} aria-pressed={tipus===m.id} onClick={()=>{setTipus(m.id);setPagina(1);setOk('');}}>{m.nom}</button>)}</div>
    <div className="weekly-week"><button aria-label="Setmana anterior" disabled={dirty||busy} onClick={()=>setmanaNova(moure(setmana,-7))}>‹</button><label htmlFor="weekly-week">Setmana del<input id="weekly-week" type="date" value={setmana} disabled={dirty||busy} onChange={e=>setmanaNova(e.target.value)} /></label><span>al {data(moure(setmana,6))}</span><button aria-label="Setmana següent" disabled={dirty||busy} onClick={()=>setmanaNova(moure(setmana,7))}>›</button></div>
    {error&&<p role="alert" className="text-error">{error}</p>}{ok&&<p role="status" className="text-success">{ok}</p>}
    {loading?<p role="status">Carregant full setmanal…</p>:model&&dades&&full&&<>
      <div className="archive-heading"><h2>{model.nom}</h2><button disabled={!full.revisionId||busy||dirty} onClick={()=>pdf(full.revisionId!,full.versio)}>PDF de la setmana</button></div>
      <details className="weekly-instructions"><summary>Indicacions del full original · P-07.12-R02 · Revisió 10</summary><p>{model.instruccions}</p></details>
      <form onSubmit={guardar} className="control-form">
        <fieldset className="weekly-fieldset" disabled={busy}>
          <div className="calendar-grid weekly-days">{dades.lectures.map((f,i)=><button key={f.dia} type="button" className={'calendar-cell'+(dia===f.dia?' calendar-cell--selected':'')} aria-pressed={dia===f.dia} onClick={()=>setDia(f.dia)}><span>{dies[i]}</span><strong>{f.dia.slice(8)}</strong>{Object.values(f.valors).some(Boolean)&&<span className="weekly-dot" aria-label="Amb lectures" />}</button>)}</div>
          <div className="archive-tabs"><button type="button" aria-pressed={seccio==='lectures'} onClick={()=>setSeccio('lectures')}>Lectures</button><button type="button" aria-pressed={seccio==='org'} onClick={()=>setSeccio('org')}>Organolèptics ({dades.organoleptics.filter(f=>f.dia===dia&&model.organoleptics.filter(c=>c.tipus==='seleccio').some(c=>!f.valors[c.key])).length} pendents)</button><button type="button" aria-pressed={seccio==='notes'} onClick={()=>setSeccio('notes')}>Anomalies i observacions</button></div>
          {seccio==='lectures'&&selected&&<><h3>Lectures del {data(dia)}</h3><p className="text-muted">Deixa en blanc les mesures que encara no s’han fet.</p><div className="weekly-groups">{model.grups.map(g=><div className="card" key={g.nom}><h3>{g.nom}</h3>{g.camps.map(c=>input(c,selected.valors[c.key]||'',v=>lectura(c.key,v),'reading'))}{tipus==='xarxa-clorada'&&dades.organoleptics.map((f,i)=>f.dia===dia&&f.lloc===g.nom?<div key={f.id}><h4>pH i terbolesa · control diari</h4>{model.organoleptics.filter(c=>(c.key.startsWith('ph_')||c.key.startsWith('terbolesa_'))&&(g.nom==='Sortida Dipòsit'||!c.key.endsWith('_auto'))).map(c=>input(c,f.valors[c.key]||'',v=>org(i,{valors:{...f.valors,[c.key]:v}}),'daily-'+i))}</div>:null)}</div>)}</div>{selected.operari&&<p className="text-muted">Última actualització d’aquest dia: {selected.operari}</p>}</>}
          {seccio==='org'&&<><p className="archive-note">{model.notaOrg}</p><h3>Organolèptics del {data(dia)}</h3>{dades.organoleptics.map((f,i)=>f.dia!==dia?null:<div className="card weekly-org" key={f.id}><h3>{f.lloc}</h3><div className="weekly-groups">{model.organoleptics.filter(c=>tipus!=='xarxa-clorada'||(!c.key.startsWith('ph_')&&!c.key.startsWith('terbolesa_'))).map(c=>input(c,f.valors[c.key]||'',v=>org(i,{valors:{...f.valors,[c.key]:v}}),'org-'+i))}</div><small>{Object.values(f.valors).some(Boolean)?'Control iniciat':'Pendent de registrar'}{f.operari?' · '+f.operari:''}</small></div>)}</>}
          {seccio==='notes'&&<><label>Anomalies / reajust{model.notaAnomalies&&<span className="archive-note">{model.notaAnomalies}</span>}<textarea rows={4} maxLength={5000} value={dades.anomalies} onChange={e=>canviar({...dades,anomalies:e.target.value})}/></label><label>Observacions de la setmana<textarea rows={4} maxLength={5000} value={dades.observacions} onChange={e=>canviar({...dades,observacions:e.target.value})}/></label></>}
          {full.versio>0&&dirty&&<label className="weekly-reason">Motiu (si corregeixes dades ja guardades)<input maxLength={1000} value={motiu} onChange={e=>{setMotiu(e.target.value);setPeticio(crypto.randomUUID());}} placeholder="Ex.: correcció de la lectura del dilluns"/></label>}
          <div className="weekly-save"><button type="submit" disabled={!dirty||busy}>{busy?'Desant…':'Desar canvis de la setmana'}</button>{dirty&&<button type="button" onClick={()=>{setDades(prepararFiles(full.dades,llocs[tipus]));setDirty(false);setError('');setMotiu('');}}>Desfer canvis sense guardar</button>}<span>{dirty?'Canvis pendents de guardar':full.versio?`Guardat · Versió ${full.versio}`:'Setmana sense registres'}</span></div>
        </fieldset>
      </form>
      <details className="weekly-summary"><summary>Veure totes les lectures de la setmana</summary><div className="table-scroll"><table><thead><tr><th>Data</th>{model.grups.flatMap(g=>g.camps.map(c=><th key={c.key}>{g.nom}<br/>{c.label}</th>))}<th>Operari</th></tr></thead><tbody>{dades.lectures.map(f=><tr key={f.id}><td>{data(f.dia)}</td>{model.grups.flatMap(g=>g.camps.map(c=><td key={c.key}>{f.valors[c.key]||'—'}</td>))}<td>{f.operari||'—'}</td></tr>)}</tbody></table></div></details>
      <details className="weekly-history"><summary>Arxiu de versions i PDF ({full.total})</summary><p className="text-muted">Cada versió conserva el PDF exacte del moment del guardat.</p><div className="archive-list">{full.historial.map(r=><article className="card" key={r.id}><div><strong>Versió {r.versio}</strong><p>{new Date(r.creatEl).toLocaleString('ca-ES',{timeZone:'Europe/Madrid'})} · {r.autorNom}</p>{r.motiu&&<p>{r.motiu}</p>}</div><button disabled={busy} onClick={()=>pdf(r.id,r.versio)}>PDF versió {r.versio}</button></article>)}</div>{full.total>20&&<div className="archive-pagination"><button disabled={dirty||busy||pagina===1} onClick={()=>setPagina(p=>p-1)}>Anterior</button><span>Pàgina {pagina}</span><button disabled={dirty||busy||pagina*20>=full.total} onClick={()=>setPagina(p=>p+1)}>Següent</button></div>}</details>
    </>}
  </section>;
}
