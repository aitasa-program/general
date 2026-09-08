import { Link } from 'react-router-dom';
import Icona from '../components/Icona';
export default function Dashboard() {
 return <div className="page menu-page"><h1>Més</h1><p className="page-subtitle">Tot el que necessites per a la jornada.</p>
 <div className="module-grid">
 <Link className="module-card" to="/registres-control"><Icona nom="file" size={30} /><strong>Registres de control</strong><span>Controls diaris i arxiu de PDF</span><Icona nom="arrow" size={18} /></Link>
 <Link className="module-card" to="/documentacio"><Icona nom="folder" size={30} /><strong>Documentació</strong><span>Carpetes i documents de consulta</span><Icona nom="arrow" size={18} /></Link>
 <Link className="module-card" to="/dia-a-dia"><Icona nom="calendar" size={30} /><strong>Dia a dia</strong><span>Tasques, checklists i formularis</span><Icona nom="arrow" size={18} /></Link>
 <Link className="module-card" to="/fitxatge"><Icona nom="clock" size={30} /><strong>Fitxatge</strong><span>Jornada i hores de RETÉN</span><Icona nom="arrow" size={18} /></Link>
 <Link className="module-card" to="/inventari"><Icona nom="box" size={30} /><strong>Magatzem</strong><span>Productes, existències i moviments</span><Icona nom="arrow" size={18} /></Link>
 <Link className="module-card" to="/comptadors"><Icona nom="gauge" size={30} /><strong>Comptadors</strong><span>Zones i empreses</span><Icona nom="arrow" size={18} /></Link>
 </div></div>;
}
