import { FormEvent, useEffect, useRef, useState } from 'react';
import { api, getUsuariActual } from '../services/api';
import { descarregarArxiu, diaLocal, errorArxiu } from '../services/arxiu';

interface Camp { key: string; label: string; tipus: 'text' | 'numero' | 'hora' | 'seleccio'; opcions?: string[] }
interface Grup { nom: string; camps: Camp[] }
interface Model { id: string; nom: string; titol: string; instruccions: string; llocs: string[]; grups: Grup[]; organoleptics: Camp[]; notaOrg: string; notaAnomalies: string; bespoke: boolean; activa: boolean }
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
const dies = ['Dl','Dt','Dc','Dj','Dv','Ds','Dg'];

interface CampEditor { key: string; label: string; tipus: Camp['tipus']; opcions: string }
interface GrupEditor { nom: string; camps: CampEditor[] }
const nouCampEditor = (): CampEditor => ({ key: '', label: '', tipus: 'numero', opcions: '' });
const nouGrupEditor = (): GrupEditor => ({ nom: '', camps: [nouCampEditor()] });

export default function ControlsSetmanals({ diaInicial }: { diaInicial?: string }) {
  const initial = /^\d{4}-\d{2}-\d{2}$/.test(diaInicial || '') && !isNaN(new Date(diaInicial!+'T12:00:00Z').getTime()) ? diaInicial! : diaLocal();
  const admin = getUsuariActual()?.rol === 'ENCARREGAT';
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

  const [editorObert,setEditorObert]=useState(false);
  const [editantId,setEditantId]=useState<string|null>(null);
  const [eNom,setENom]=useState('');
  const [eTitol,setETitol]=useState('');
  const [eInstruccions,setEInstruccions]=useState('');
  const [eLlocs,setELlocs]=useState('');
  const [eAutoPerLloc,setEAutoPerLloc]=useState(false);
  const [eNotaOrg,setENotaOrg]=useState('');
  const [eNotaAnomalies,setENotaAnomalies]=useState('');
  const [eActiva,setEActiva]=useState(true);
  const [eGrups,setEGrups]=useState<GrupEditor[]>([nouGrupEditor()]);

  async function carregarModels() { const r = await api.get('/controls/setmanals/models'); setModels(r.data); }
  useEffect(()=>{carregarModels().catch(e=>setError(errorArxiu(e)));},[]);
  useEffect(()=>{
    let cancel=false;setLoading(true);setError('');
    api.get(`/controls/setmanals/${tipus}/${setmana}`,{params:{pagina}}).then(r=>{
      if(cancel)return;setFull(r.data);setDades(prepararFiles(r.data.dades,model?.llocs||[]));setDirty(false);setMotiu('');setPeticio(crypto.randomUUID());
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

  function obrirNouModel(){
    setEditantId(null);setENom('');setETitol('');setEInstruccions('');setELlocs('');setEAutoPerLloc(false);
    setENotaOrg('');setENotaAnomalies('');setEActiva(true);setEGrups([nouGrupEditor()]);setEditorObert(true);setError('');
  }
  function obrirEdicioModel(m: Model){
    setEditantId(m.id);setENom(m.nom);setETitol(m.titol);setEInstruccions(m.instruccions);
    setELlocs(m.llocs.join('\n'));setEAutoPerLloc(m.organoleptics.some(c=>c.key.endsWith('_auto')));
    setENotaOrg(m.notaOrg);setENotaAnomalies(m.notaAnomalies);setEActiva(m.activa);
    setEGrups(m.grups.map(g=>({nom:g.nom,camps:g.camps.map(c=>({key:c.key,label:c.label,tipus:c.tipus,opcions:(c.opcions||[]).join(', ')}))})));
    setEditorObert(true);setError('');
  }
  function editarGrup(i:number,patch:Partial<GrupEditor>){setEGrups(prev=>prev.map((g,n)=>n===i?{...g,...patch}:g));}
  function editarCampGrup(gi:number,ci:number,patch:Partial<CampEditor>){setEGrups(prev=>prev.map((g,n)=>n===gi?{...g,camps:g.camps.map((c,m)=>m===ci?{...c,...patch}:c)}:g));}
  async function guardarModel(e:FormEvent){
    e.preventDefault();if(saving.current)return;saving.current=true;setBusy(true);setError('');
    try{
      const body={
        nom:eNom, titol:eTitol, instruccions:eInstruccions,
        llocs:eLlocs.split('\n').map(l=>l.trim()).filter(Boolean),
        grups:eGrups.map(g=>({nom:g.nom.trim(),camps:g.camps.map(c=>({key:c.key.trim(),label:c.label.trim(),tipus:c.tipus,...(c.tipus==='seleccio'?{opcions:c.opcions.split(',').map(o=>o.trim()).filter(Boolean)}:{})}))})),
        autoPerLloc:eAutoPerLloc, notaOrg:eNotaOrg, notaAnomalies:eNotaAnomalies,
      };
      if(editantId) await api.patch(`/controls/setmanals/models/${editantId}`,{...body,activa:eActiva});
      else {const creat=await api.post('/controls/setmanals/models',body);setTipus(creat.data.id);}
      await carregarModels();setEditorObert(false);setOk('Control setmanal guardat.');
    }catch(e){setError(errorArxiu(e));}finally{saving.current=false;setBusy(false);}
  }

  const selected=dades?.lectures.find(f=>f.dia===dia);
  return <section className="weekly-controls" aria-label="Controls setmanals">
    <p className="text-muted">Un mateix full per a tota la setmana. Completa-la cada dia i descarrega el PDF quan el necessitis.</p>
    <div className="archive-tabs">
      {models.map(m=><button disabled={dirty||busy} key={m.id} aria-pressed={tipus===m.id} onClick={()=>{setTipus(m.id);setPagina(1);setOk('');}}>{m.nom}{!m.activa?' (arxivat)':''}</button>)}
      {admin && <button type="button" disabled={dirty||busy} onClick={obrirNouModel}>+ Nou control setmanal</button>}
    </div>
    {admin && model && !editorObert && <button type="button" disabled={dirty||busy} onClick={()=>obrirEdicioModel(model)} style={{fontSize:12,marginBottom:10}}>Editar "{model.nom}"</button>}

    {editorObert && (
      <form onSubmit={guardarModel} className="card control-form" style={{marginBottom:20,width:'100%'}}>
        <h3>{editantId?`Editar "${eNom}"`:'Nou control setmanal'}</h3>
        <label>Nom (a la pestanya)<input value={eNom} onChange={e=>setENom(e.target.value)} required maxLength={120} style={{width:'100%'}}/></label>
        <label>Títol (capçalera del PDF)<input value={eTitol} onChange={e=>setETitol(e.target.value)} required maxLength={160} style={{width:'100%'}}/></label>
        <label>Indicacions<textarea value={eInstruccions} onChange={e=>setEInstruccions(e.target.value)} rows={3} style={{width:'100%'}}/></label>
        <label>Llocs/punts de control (un per línia)<textarea value={eLlocs} onChange={e=>setELlocs(e.target.value)} rows={3} required placeholder={'Sortida Dipòsit\nRepsol Tanques'} style={{width:'100%'}}/></label>
        <label className="inline-check"><input type="checkbox" checked={eAutoPerLloc} onChange={e=>setEAutoPerLloc(e.target.checked)}/>Les lectures de pH/terbolesa automàtiques només corresponen al primer lloc de la llista (com la Xarxa Clorada)</label>

        <h4 style={{marginTop:14}}>Grups de lectures (una columna del full per cada grup)</h4>
        {eGrups.map((g,gi)=>(
          <fieldset className="field-editor" key={gi}>
            <legend>Grup {gi+1}</legend>
            <label>Nom del grup<input value={g.nom} onChange={e=>editarGrup(gi,{nom:e.target.value})} required maxLength={120}/></label>
            {g.camps.map((c,ci)=>(
              <div key={ci} style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'flex-end',marginTop:6}}>
                <label>Clau (sense espais)<input value={c.key} onChange={e=>editarCampGrup(gi,ci,{key:e.target.value.replace(/[^a-z0-9_]/gi,'_').toLowerCase()})} required maxLength={60} style={{width:140}}/></label>
                <label>Etiqueta<input value={c.label} onChange={e=>editarCampGrup(gi,ci,{label:e.target.value})} required maxLength={120} style={{width:160}}/></label>
                <label>Tipus<select value={c.tipus} onChange={e=>editarCampGrup(gi,ci,{tipus:e.target.value as Camp['tipus']})}><option value="numero">Número</option><option value="text">Text</option><option value="hora">Hora</option><option value="seleccio">Desplegable</option></select></label>
                {c.tipus==='seleccio' && <label>Opcions (separades per comes)<input value={c.opcions} onChange={e=>editarCampGrup(gi,ci,{opcions:e.target.value})} style={{width:200}}/></label>}
                <button type="button" disabled={g.camps.length===1} onClick={()=>editarGrup(gi,{camps:g.camps.filter((_,n)=>n!==ci)})}>Treure camp</button>
              </div>
            ))}
            <div style={{marginTop:8,display:'flex',gap:8}}>
              <button type="button" onClick={()=>editarGrup(gi,{camps:[...g.camps,nouCampEditor()]})}>+ Afegir camp al grup</button>
              <button type="button" disabled={eGrups.length===1} onClick={()=>setEGrups(prev=>prev.filter((_,n)=>n!==gi))}>Treure grup</button>
            </div>
          </fieldset>
        ))}
        <button type="button" onClick={()=>setEGrups(prev=>[...prev,nouGrupEditor()])}>+ Afegir grup</button>

        <label style={{marginTop:14,display:'block'}}>Nota dels controls organolèptics<textarea value={eNotaOrg} onChange={e=>setENotaOrg(e.target.value)} rows={2} style={{width:'100%'}}/></label>
        <label>Nota d'anomalies/reajust (opcional)<textarea value={eNotaAnomalies} onChange={e=>setENotaAnomalies(e.target.value)} rows={2} style={{width:'100%'}}/></label>
        {editantId && <label className="inline-check"><input type="checkbox" checked={eActiva} onChange={e=>setEActiva(e.target.checked)}/>Actiu (visible a la pestanya)</label>}

        <p className="archive-note">Els controls nous fan servir un disseny de PDF senzill (es pot personalitzar el logo/color/peu a "Configuració del PDF"). Els 4 originals mantenen el seu disseny fix del full en paper encara que n'editis el nom o els camps.</p>
        <div className="archive-actions"><button type="submit" disabled={busy}>{busy?'Desant…':'Desar control setmanal'}</button><button type="button" disabled={busy} onClick={()=>setEditorObert(false)}>Cancel·lar</button></div>
      </form>
    )}

    <div className="weekly-week"><button aria-label="Setmana anterior" disabled={dirty||busy} onClick={()=>setmanaNova(moure(setmana,-7))}>‹</button><label htmlFor="weekly-week">Setmana del<input id="weekly-week" type="date" value={setmana} disabled={dirty||busy} onChange={e=>setmanaNova(e.target.value)} /></label><span>al {data(moure(setmana,6))}</span><button aria-label="Setmana següent" disabled={dirty||busy} onClick={()=>setmanaNova(moure(setmana,7))}>›</button></div>
    {error&&<p role="alert" className="text-error">{error}</p>}{ok&&<p role="status" className="text-success">{ok}</p>}
    {loading?<p role="status">Carregant full setmanal…</p>:model&&dades&&full&&<>
      <div className="archive-heading"><h2>{model.nom}</h2><button disabled={!full.revisionId||busy||dirty} onClick={()=>pdf(full.revisionId!,full.versio)}>PDF de la setmana</button></div>
      <details className="weekly-instructions"><summary>Indicacions{model.bespoke?' del full original · P-07.12-R02 · Revisió 10':''}</summary><p>{model.instruccions}</p></details>
      <form onSubmit={guardar} className="control-form">
        <fieldset className="weekly-fieldset" disabled={busy}>
          <div className="calendar-grid weekly-days">{dades.lectures.map((f,i)=><button key={f.dia} type="button" className={'calendar-cell'+(dia===f.dia?' calendar-cell--selected':'')} aria-pressed={dia===f.dia} onClick={()=>setDia(f.dia)}><span>{dies[i]}</span><strong>{f.dia.slice(8)}</strong>{Object.values(f.valors).some(Boolean)&&<span className="weekly-dot" aria-label="Amb lectures" />}</button>)}</div>
          <div className="archive-tabs"><button type="button" aria-pressed={seccio==='lectures'} onClick={()=>setSeccio('lectures')}>Lectures</button><button type="button" aria-pressed={seccio==='org'} onClick={()=>setSeccio('org')}>Organolèptics ({dades.organoleptics.filter(f=>f.dia===dia&&model.organoleptics.filter(c=>c.tipus==='seleccio').some(c=>!f.valors[c.key])).length} pendents)</button><button type="button" aria-pressed={seccio==='notes'} onClick={()=>setSeccio('notes')}>Anomalies i observacions</button></div>
          {seccio==='lectures'&&selected&&<><h3>Lectures del {data(dia)}</h3><p className="text-muted">Deixa en blanc les mesures que encara no s’han fet.</p><div className="weekly-groups">{model.grups.map(g=><div className="card" key={g.nom}><h3>{g.nom}</h3>{g.camps.map(c=>input(c,selected.valors[c.key]||'',v=>lectura(c.key,v),'reading'))}{dades.organoleptics.map((f,i)=>f.dia===dia&&f.lloc===g.nom?<div key={f.id}><h4>pH i terbolesa · control diari</h4>{model.organoleptics.filter(c=>(c.key==='ph'||c.key==='terbolesa'||c.key.startsWith('ph_')||c.key.startsWith('terbolesa_'))&&(g.nom===model.llocs[0]||!c.key.endsWith('_auto'))).map(c=>input(c,f.valors[c.key]||'',v=>org(i,{valors:{...f.valors,[c.key]:v}}),'daily-'+i))}</div>:null)}</div>)}</div>{selected.operari&&<p className="text-muted">Última actualització d’aquest dia: {selected.operari}</p>}</>}
          {seccio==='org'&&<><p className="archive-note">{model.notaOrg}</p><h3>Organolèptics del {data(dia)}</h3>{dades.organoleptics.map((f,i)=>f.dia!==dia?null:<div className="card weekly-org" key={f.id}><h3>{f.lloc}</h3><div className="weekly-groups">{model.organoleptics.filter(c=>c.key!=='ph'&&c.key!=='terbolesa'&&!c.key.startsWith('ph_')&&!c.key.startsWith('terbolesa_')).map(c=>input(c,f.valors[c.key]||'',v=>org(i,{valors:{...f.valors,[c.key]:v}}),'org-'+i))}</div><small>{Object.values(f.valors).some(Boolean)?'Control iniciat':'Pendent de registrar'}{f.operari?' · '+f.operari:''}</small></div>)}</>}
          {seccio==='notes'&&<><label>Anomalies / reajust{model.notaAnomalies&&<span className="archive-note">{model.notaAnomalies}</span>}<textarea rows={4} maxLength={5000} value={dades.anomalies} onChange={e=>canviar({...dades,anomalies:e.target.value})}/></label><label>Observacions de la setmana<textarea rows={4} maxLength={5000} value={dades.observacions} onChange={e=>canviar({...dades,observacions:e.target.value})}/></label></>}
          {full.versio>0&&dirty&&<label className="weekly-reason">Motiu (si corregeixes dades ja guardades)<input maxLength={1000} value={motiu} onChange={e=>{setMotiu(e.target.value);setPeticio(crypto.randomUUID());}} placeholder="Ex.: correcció de la lectura del dilluns"/></label>}
          <div className="weekly-save"><button type="submit" disabled={!dirty||busy}>{busy?'Desant…':'Desar canvis de la setmana'}</button>{dirty&&<button type="button" onClick={()=>{setDades(prepararFiles(full.dades,model.llocs));setDirty(false);setError('');setMotiu('');}}>Desfer canvis sense guardar</button>}<span>{dirty?'Canvis pendents de guardar':full.versio?`Guardat · Versió ${full.versio}`:'Setmana sense registres'}</span></div>
        </fieldset>
      </form>
      <details className="weekly-summary"><summary>Veure totes les lectures de la setmana</summary><div className="table-scroll"><table><thead><tr><th>Data</th>{model.grups.flatMap(g=>g.camps.map(c=><th key={c.key}>{g.nom}<br/>{c.label}</th>))}<th>Operari</th></tr></thead><tbody>{dades.lectures.map(f=><tr key={f.id}><td>{data(f.dia)}</td>{model.grups.flatMap(g=>g.camps.map(c=><td key={c.key}>{f.valors[c.key]||'—'}</td>))}<td>{f.operari||'—'}</td></tr>)}</tbody></table></div></details>
      <details className="weekly-history"><summary>Arxiu de versions i PDF ({full.total})</summary><p className="text-muted">Cada versió conserva el PDF exacte del moment del guardat.</p><div className="archive-list">{full.historial.map(r=><article className="card" key={r.id}><div><strong>Versió {r.versio}</strong><p>{new Date(r.creatEl).toLocaleString('ca-ES',{timeZone:'Europe/Madrid'})} · {r.autorNom}</p>{r.motiu&&<p>{r.motiu}</p>}</div><button disabled={busy} onClick={()=>pdf(r.id,r.versio)}>PDF versió {r.versio}</button></article>)}</div>{full.total>20&&<div className="archive-pagination"><button disabled={dirty||busy||pagina===1} onClick={()=>setPagina(p=>p-1)}>Anterior</button><span>Pàgina {pagina}</span><button disabled={dirty||busy||pagina*20>=full.total} onClick={()=>setPagina(p=>p+1)}>Següent</button></div>}</details>
    </>}
  </section>;
}
