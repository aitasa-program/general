import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getUsuariActual } from '../services/api';
import { useVistaTreballador } from '../utils/vistaTreballador';
import { errorArxiu } from '../services/arxiu';
import BotoTornar from '../components/BotoTornar';

interface Mostra { id:string; grup:string; titol:string; data:string; notes:string; intervalDies:number; feta:boolean; href?:string }
const buida={grup:'XC',titol:'',data:'',notes:'',intervalDies:0};
function grupDe(text:string) { return text.match(/XR-Z[NS]|\bXC\b|\bXI\b|\bTC\b/i)?.[0].toUpperCase() || (/legio/i.test(text)?'Legionel·la':'Altres'); }
const dia=(iso:string)=>new Date(iso).toLocaleDateString('sv-SE');
export default function Mostres() {
 const [vista]=useVistaTreballador(); const admin=getUsuariActual()?.rol==='ENCARREGAT'&&!vista;
 const [mostres,setMostres]=useState<Mostra[]>([]); const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
 const [grup,setGrup]=useState(''); const [cerca,setCerca]=useState(''); const [mes,setMes]=useState('');
 const [editar,setEditar]=useState<string|null>(null); const [form,setForm]=useState(buida);
 async function carregar(){setBusy(true);setError('');try{
  const [m,t,c]=await Promise.all([api.get('/mostres'),api.get('/tasques'),api.get('/checklists')]);
  const originals:Mostra[]=[];
  for(const x of t.data)if(/mostr|legio/i.test(x.titol)) originals.push({id:'t-'+x.id,grup:grupDe(x.titol),titol:x.titol,data:x.dataLimit?dia(x.dataLimit):'',notes:x.descripcio||'',intervalDies:x.repeticio==='SETMANAL'?7:0,feta:x.estat==='FETA',href:'/tasques'});
  for(const x of c.data)for(const item of x.items)if(/mostr|legio/i.test(item.text)) originals.push({id:'c-'+item.id,grup:grupDe(item.text),titol:item.text,data:dia(x.data),notes:x.nom,intervalDies:x.frequencia==='SETMANAL'?7:0,feta:item.marcat,href:'/checklists'});
  setMostres([...m.data,...originals].sort((a,b)=>a.data.localeCompare(b.data)||a.grup.localeCompare(b.grup)));
 }catch(e){setError(errorArxiu(e));}finally{setBusy(false);}}
 useEffect(()=>{void carregar();},[]);
 async function desar(e:FormEvent){e.preventDefault();setBusy(true);setError('');try{if(editar==='nova')await api.post('/mostres',form);else await api.patch('/mostres/'+editar,form);setEditar(null);await carregar();}catch(e){setError(errorArxiu(e));}finally{setBusy(false);}}
 async function estat(m:Mostra){setBusy(true);try{await api.patch('/mostres/'+m.id+'/estat',{feta:!m.feta});await carregar();}catch(e){setError(errorArxiu(e));}finally{setBusy(false);}}
 const grups=[...new Set(['XC','XI','XR-ZS','XR-ZN','TC',...mostres.map(m=>m.grup)])];
 const visibles=mostres.filter(m=>(!grup||m.grup===grup)&&(!mes||m.data.startsWith(mes))&&`${m.titol} ${m.notes}`.toLowerCase().includes(cerca.toLowerCase()));
 return <div className="page archive-page"><BotoTornar/><h1>Mostres</h1><p className="page-subtitle">Recollides programades i mostres de les tasques habituals.</p>
 <div className="archive-heading"><Link to="/documentacio">Mapes i documentació</Link>{admin&&<button onClick={()=>{setForm(buida);setEditar('nova');}}>+ Nova mostra</button>}</div>
 {error&&<p role="alert" className="text-error">{error}</p>}
 {editar&&<form className="card control-form" onSubmit={desar}><h2>{editar==='nova'?'Nova mostra':'Editar mostra'}</h2>
 <label>Grup<input list="grups-mostres" required value={form.grup} maxLength={80} onChange={e=>setForm({...form,grup:e.target.value})}/></label><datalist id="grups-mostres">{grups.map(g=><option key={g} value={g}/>)}</datalist>
 <label>Mostra / punt de recollida<input required maxLength={250} value={form.titol} onChange={e=>setForm({...form,titol:e.target.value})}/></label>
 <label>Data<input required type="date" value={form.data} onChange={e=>setForm({...form,data:e.target.value})}/></label>
 <label>Repetició<select value={form.intervalDies} onChange={e=>setForm({...form,intervalDies:Number(e.target.value)})}><option value={0}>Una vegada</option><option value={7}>Cada setmana</option><option value={14}>Cada dues setmanes</option></select></label>
 <label>Notes<textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label><button disabled={busy}>Desar</button><button type="button" onClick={()=>setEditar(null)}>Cancel·lar</button></form>}
 <div className="card" style={{display:'flex',gap:12,flexWrap:'wrap'}}><label>Grup<select value={grup} onChange={e=>setGrup(e.target.value)}><option value="">Tots</option>{grups.map(g=><option key={g}>{g}</option>)}</select></label><label>Mes<input type="month" value={mes} onChange={e=>setMes(e.target.value)}/></label><label>Cercar<input type="search" value={cerca} onChange={e=>setCerca(e.target.value)}/></label></div>
 {busy&&<p role="status">Carregant…</p>}<p>{visibles.length} mostres</p>
 {visibles.map(m=><article className="card" key={m.id}><small>{m.grup} · {m.data?m.data.split('-').reverse().join('/'):'Sense data'}{m.intervalDies?` · Cada ${m.intervalDies} dies`:''}</small><h2>{m.titol}</h2><p style={{whiteSpace:'pre-wrap'}}>{m.notes}</p><p>{m.feta?'Feta':'Pendent'}</p>{m.href?<Link to={m.href}>Obrir la tasca original</Link>:admin&&<><button disabled={busy} onClick={()=>void estat(m)}>{m.feta?'Marcar pendent':'Marcar feta'}</button> <button onClick={()=>{setEditar(m.id);setForm({grup:m.grup,titol:m.titol,data:m.data,notes:m.notes,intervalDies:m.intervalDies});}}>Editar</button></>}</article>)}
 {!busy&&!visibles.length&&<p>No hi ha mostres amb aquests filtres.</p>}</div>;
}
