import { Link } from 'react-router-dom';
import Icona from '../components/Icona';
import { getUsuariActual } from '../services/api';
import { useVistaTreballador } from '../utils/vistaTreballador';
export default function Dashboard() {
 const [vista] = useVistaTreballador();
 const admin = getUsuariActual()?.rol === 'ENCARREGAT' && !vista;
 return <div className="page menu-page"><h1>Més</h1><p className="page-subtitle">Tot el que necessites per a la jornada.</p>
 <div className="module-grid">
 <Link className="module-card" to="/mostres"><Icona nom="file" size={30} /><strong>Mostres</strong><span>Recollides programades</span><Icona nom="arrow" size={18} /></Link>
 <Link className="module-card" to="/mapa"><Icona nom="map" size={30} /><strong>Mapa</strong><span>Xarxes, pous i comptadors</span><Icona nom="arrow" size={18} /></Link>
 <Link className="module-card" to="/registres-control"><Icona nom="file" size={30} /><strong>Registres de control</strong><span>Controls diaris i arxiu de PDF</span><Icona nom="arrow" size={18} /></Link>
 <Link className="module-card" to="/documentacio"><Icona nom="folder" size={30} /><strong>Documentació</strong><span>Carpetes i documents de consulta</span><Icona nom="arrow" size={18} /></Link>
 <Link className="module-card" to="/dia-a-dia"><Icona nom="calendar" size={30} /><strong>Dia a dia</strong><span>Tasques, checklists i formularis</span><Icona nom="arrow" size={18} /></Link>
 <Link className="module-card" to="/fitxatge"><Icona nom="clock" size={30} /><strong>Fitxatge</strong><span>Jornada i hores de RETÉN</span><Icona nom="arrow" size={18} /></Link>
 <Link className="module-card" to="/inventari"><Icona nom="box" size={30} /><strong>Magatzem</strong><span>Productes, existències i moviments</span><Icona nom="arrow" size={18} /></Link>
 <Link className="module-card" to="/comptadors"><Icona nom="gauge" size={30} /><strong>Comptadors</strong><span>Zones i empreses</span><Icona nom="arrow" size={18} /></Link>
 <Link className="module-card" to="/manteniment"><Icona nom="wrench" size={30} /><strong>Manteniment</strong><span>Pla de manteniment i registres (pròximament)</span><Icona nom="arrow" size={18} /></Link>
 <Link className="module-card" to="/notes-personals"><Icona nom="note" size={30} /><strong>Les meves notes</strong><span>Notes i fotos privades, només teves</span><Icona nom="arrow" size={18} /></Link>
 <Link className="module-card" to="/avaries"><Icona nom="alert" size={30} /><strong>Avaries</strong><span>Registra-les i demana un diagnòstic a la IA</span><Icona nom="arrow" size={18} /></Link>
 </div>
 {admin && <>
  <h2 className="section-title" style={{ marginTop: 28 }}>Administració</h2>
  <div className="module-grid">
   <Link className="module-card" to="/tasques-reten"><Icona nom="list" size={30} /><strong>Tasques RETÉN</strong><span>Checklist setmanal de qui està de retén</span><Icona nom="arrow" size={18} /></Link>
   <Link className="module-card" to="/tasques-quinzenals"><Icona nom="calendar" size={30} /><strong>Quinzenals A</strong><span>Checklist de la quinzena A</span><Icona nom="arrow" size={18} /></Link>
   <Link className="module-card" to="/tasques-quinzenals-b"><Icona nom="calendar" size={30} /><strong>Quinzenals B</strong><span>Checklist de la quinzena B</span><Icona nom="arrow" size={18} /></Link>
   <Link className="module-card" to="/vehicles"><Icona nom="car" size={30} /><strong>ITV i revisions</strong><span>Dates dels vehicles de l'empresa</span><Icona nom="arrow" size={18} /></Link>
   <Link className="module-card" to="/usuaris"><Icona nom="users" size={30} /><strong>Gestionar usuaris</strong><span>Altes, rols i contrasenyes</span><Icona nom="arrow" size={18} /></Link>
   <Link className="module-card" to="/ia-modificacions"><Icona nom="sparkle" size={30} /><strong>Modificacions APP</strong><span>Demanar canvis a l'app amb IA</span><Icona nom="arrow" size={18} /></Link>
  </div>
 </>}
 </div>;
}
