import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getUsuariActual } from '../services/api';
import { useVistaTreballador } from '../utils/vistaTreballador';
import { errorArxiu } from '../services/arxiu';
import { llistarUsuaris, Usuari } from '../services/usuaris';
import BotoTornar from '../components/BotoTornar';

interface Mostra { id:string; grup:string; titol:string; data:string; ubicacio:string; notes:string; intervalDies:number; feta:boolean; href?:string; usuariAssignatId?:string|null; responsable?:{id:string;nom:string}|null }
const buida={grup:'XC',titol:'',data:'',ubicacio:'',notes:'',intervalDies:0,usuariAssignatId:''};
function grupDe(text:string) { return text.match(/XR-Z[NS]|\bXC\b|\bXI\b|\bTC\b/i)?.[0].toUpperCase() || (/legio/i.test(text)?'Legionel·la':'Altres'); }
const dia=(iso:string)=>new Date(iso).toLocaleDateString('sv-SE');
const MESOS=['Gener','Febrer','Març','Abril','Maig','Juny','Juliol','Agost','Setembre','Octubre','Novembre','Desembre'];
const DIES_SETMANA=['Dl','Dt','Dc','Dj','Dv','Ds','Dg'];
function inicioSetmana(d:Date){const dt=new Date(d);const dow=(dt.getDay()+6)%7;dt.setDate(dt.getDate()-dow);dt.setHours(0,0,0,0);return dt;}
function graellaDelMes(ancora:Date){const primerDia=new Date(ancora.getFullYear(),ancora.getMonth(),1);const inici=inicioSetmana(primerDia);return Array.from({length:42},(_,i)=>{const d=new Date(inici);d.setDate(inici.getDate()+i);return d;});}
function dataInput(d:Date){const pad=(n:number)=>String(n).padStart(2,'0');return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;}
function mateixDia(a:Date,b:Date){return dataInput(a)===dataInput(b);}
const SENSE_RETEN_AUTOMATIC=['TC','EPN','EPS'];

export default function Mostres() {
 const [vista]=useVistaTreballador(); const admin=getUsuariActual()?.rol==='ENCARREGAT'&&!vista;
 const [mostres,setMostres]=useState<Mostra[]>([]); const [usuaris,setUsuaris]=useState<Usuari[]>([]); const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
 const [grup,setGrup]=useState(''); const [cerca,setCerca]=useState('');
 const [editar,setEditar]=useState<string|null>(null); const [form,setForm]=useState(buida);
 const [vistaCal,setVistaCal]=useState(true); const [ancora,setAncora]=useState(new Date());
 const avui=new Date(); const [diaSeleccionat,setDiaSeleccionat]=useState<Date|null>(null);
 async function carregar(){setBusy(true);setError('');try{
  const [m,t,c]=await Promise.all([api.get('/mostres'),api.get('/tasques'),api.get('/checklists')]);
  if(admin)llistarUsuaris().then(setUsuaris).catch(()=>{});
  const originals:Mostra[]=[];
  for(const x of t.data)if(/mostr|legio/i.test(x.titol)) originals.push({id:'t-'+x.id,grup:grupDe(x.titol),titol:x.titol,data:x.dataLimit?dia(x.dataLimit):'',ubicacio:'',notes:x.descripcio||'',intervalDies:x.repeticio==='SETMANAL'?7:0,feta:x.estat==='FETA',href:'/tasques'});
  for(const x of c.data)for(const item of x.items)if(/mostr|legio/i.test(item.text)) originals.push({id:'c-'+item.id,grup:grupDe(item.text),titol:item.text,data:dia(x.data),ubicacio:'',notes:x.nom,intervalDies:x.frequencia==='SETMANAL'?7:0,feta:item.marcat,href:'/checklists'});
  setMostres([...m.data,...originals].sort((a,b)=>a.data.localeCompare(b.data)||a.grup.localeCompare(b.grup)));
 }catch(e){setError(errorArxiu(e));}finally{setBusy(false);}}
 useEffect(()=>{void carregar();},[]);
 async function desar(e:FormEvent){e.preventDefault();setBusy(true);setError('');try{
  const body={...form,usuariAssignatId:form.usuariAssignatId||null};
  if(editar==='nova')await api.post('/mostres',body);else await api.patch('/mostres/'+editar,body);
  setEditar(null);await carregar();}catch(e){setError(errorArxiu(e));}finally{setBusy(false);}}
 async function estat(m:Mostra){setBusy(true);try{await api.patch('/mostres/'+m.id+'/estat',{feta:!m.feta});await carregar();}catch(e){setError(errorArxiu(e));}finally{setBusy(false);}}
 const grups=[...new Set(['XC','XI','XR-ZS','XR-ZN','TC','EPN','EPS',...mostres.map(m=>m.grup)])];
 const visiblesSenseDia=mostres.filter(m=>(!grup||m.grup===grup)&&`${m.titol} ${m.notes}`.toLowerCase().includes(cerca.toLowerCase()));
 const visibles=diaSeleccionat?visiblesSenseDia.filter(m=>m.data===dataInput(diaSeleccionat)):visiblesSenseDia;
 const diesVisibles=graellaDelMes(ancora);
 return <div className="page archive-page"><BotoTornar/><h1>Mostres</h1><p className="page-subtitle">Recollides programades i mostres de les tasques habituals.</p>
 <div className="archive-heading"><Link to="/documentacio">Mapes i documentació</Link>
  <span style={{display:'flex',gap:8}}>
   <button aria-pressed={vistaCal} onClick={()=>setVistaCal(true)}>Calendari</button>
   <button aria-pressed={!vistaCal} onClick={()=>{setVistaCal(false);setDiaSeleccionat(null);}}>Llista</button>
   {admin&&<button onClick={()=>{setForm({...buida,data:diaSeleccionat?dataInput(diaSeleccionat):''});setEditar('nova');}}>+ Nova mostra</button>}
  </span>
 </div>
 {error&&<p role="alert" className="text-error">{error}</p>}
 {editar&&<form className="card control-form" onSubmit={desar}><h2>{editar==='nova'?'Nova mostra':'Editar mostra'}</h2>
 <label>Grup<input list="grups-mostres" required value={form.grup} maxLength={80} onChange={e=>setForm({...form,grup:e.target.value})}/></label><datalist id="grups-mostres">{grups.map(g=><option key={g} value={g}/>)}</datalist>
 <label>Mostra / punt de recollida<input required maxLength={250} value={form.titol} onChange={e=>setForm({...form,titol:e.target.value})}/></label>
 <label>Ubicació<input maxLength={250} value={form.ubicacio} onChange={e=>setForm({...form,ubicacio:e.target.value})}/></label>
 <label>Data<input required type="date" value={form.data} onChange={e=>setForm({...form,data:e.target.value})}/></label>
 <label>Repetició<select value={form.intervalDies} onChange={e=>setForm({...form,intervalDies:Number(e.target.value)})}><option value={0}>Una vegada</option><option value={7}>Cada setmana</option><option value={14}>Cada dues setmanes</option></select></label>
 <label>Responsable (opcional)<select value={form.usuariAssignatId} onChange={e=>setForm({...form,usuariAssignatId:e.target.value})}><option value="">{SENSE_RETEN_AUTOMATIC.includes(form.grup)?'Sense assignar':'Qui estigui de retén aquella setmana'}</option>{usuaris.map(u=><option key={u.id} value={u.id}>{u.nom}</option>)}</select></label>
 <label>Notes (referència interna, no es mostra a la fitxa)<textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label><button disabled={busy}>Desar</button><button type="button" onClick={()=>setEditar(null)}>Cancel·lar</button></form>}
 <div className="card" style={{display:'flex',gap:12,flexWrap:'wrap'}}><label>Grup<select value={grup} onChange={e=>setGrup(e.target.value)}><option value="">Tots</option>{grups.map(g=><option key={g}>{g}</option>)}</select></label><label>Cercar<input type="search" value={cerca} onChange={e=>setCerca(e.target.value)}/></label></div>

 {vistaCal&&<>
  <div className="calendar-toolbar">
   <button aria-label="Mes anterior" onClick={()=>setAncora(new Date(ancora.getFullYear(),ancora.getMonth()-1,1))}>‹</button>
   <span className="calendar-toolbar__label">{MESOS[ancora.getMonth()]} {ancora.getFullYear()}</span>
   <button aria-label="Mes següent" onClick={()=>setAncora(new Date(ancora.getFullYear(),ancora.getMonth()+1,1))}>›</button>
   <button onClick={()=>{setAncora(new Date());setDiaSeleccionat(new Date());}}>Avui</button>
  </div>
  <div className="calendar-grid">
   {DIES_SETMANA.map(d=><div key={d} className="calendar-weekday">{d}</div>)}
   {diesVisibles.map((d,i)=>{
    const esDelMesActual=d.getMonth()===ancora.getMonth();
    const delDia=visiblesSenseDia.filter(m=>m.data===dataInput(d));
    const classes=['calendar-cell'];
    if(!esDelMesActual)classes.push('calendar-cell--muted');
    if(mateixDia(d,avui))classes.push('calendar-cell--today');
    if(diaSeleccionat&&mateixDia(d,diaSeleccionat))classes.push('calendar-cell--selected');
    return <button type="button" key={i} className={classes.join(' ')} aria-label={d.toLocaleDateString('ca-ES',{weekday:'long',day:'numeric',month:'long'})} onClick={()=>setDiaSeleccionat(diaSeleccionat&&mateixDia(d,diaSeleccionat)?null:d)}>
     <span>{d.getDate()}</span>
     {delDia.length>0&&<div className="calendar-dots">{delDia.slice(0,4).map((_,n)=><span key={n} className="calendar-dot calendar-dot--mostra"/>)}</div>}
    </button>;
   })}
  </div>
  {diaSeleccionat&&<p className="text-muted" style={{marginTop:8}}>{diaSeleccionat.toLocaleDateString('ca-ES',{weekday:'long',day:'numeric',month:'long'})} — <button type="button" onClick={()=>setDiaSeleccionat(null)} style={{fontSize:12}}>Veure tot el mes</button></p>}
 </>}

 {busy&&<p role="status">Carregant…</p>}<p>{visibles.length} mostres</p>
 {visibles.map(m=><article className="card" key={m.id}><small>{m.data?m.data.split('-').reverse().join('/'):'Sense data'}</small><h2>{m.titol}</h2>
 {m.ubicacio&&<p className="text-muted">{m.ubicacio}</p>}
 <p className="text-muted" style={{fontSize:12}}>{m.responsable?m.responsable.nom:SENSE_RETEN_AUTOMATIC.includes(m.grup)?'Sense assignar':'Sense retén assignat'}</p>
 {m.href?<Link to={m.href}>Obrir la tasca original</Link>:admin&&<><button disabled={busy} onClick={()=>void estat(m)}>{m.feta?'Marcar pendent':'Marcar feta'}</button> <button onClick={()=>{setEditar(m.id);setForm({grup:m.grup,titol:m.titol,data:m.data,ubicacio:m.ubicacio,notes:m.notes,intervalDies:m.intervalDies,usuariAssignatId:m.usuariAssignatId||''});}}>Editar</button></>}</article>)}
 {!busy&&!visibles.length&&<p>No hi ha mostres amb aquests filtres.</p>}</div>;
}
