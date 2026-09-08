import { Link, NavLink, useNavigate } from 'react-router-dom';
import { getUsuariActual, logout } from '../services/api';
import { useVistaTreballador } from '../utils/vistaTreballador';
import Icona from './Icona';
export default function Capcalera() {
 const navigate = useNavigate();
 const usuari = getUsuariActual();
 const [vista, setVista] = useVistaTreballador();
 return <header className="topbar"><div className="topbar-inner">
  <Link to="/dia-a-dia" className="brand" aria-label="AITASA · Dia a dia"><img src="/logo.png" alt="AITASA" /></Link>
  <nav className="desktop-nav" aria-label="Navegació principal">
   <NavLink to="/dia-a-dia"><Icona nom="calendar" size={18} />Dia a dia</NavLink>
   <NavLink to="/fitxatge"><Icona nom="clock" size={18} />Fitxatge</NavLink>
   <NavLink to="/registres-control"><Icona nom="file" size={18} />Registres de control</NavLink>
   <NavLink to="/documentacio"><Icona nom="folder" size={18} />Documentació</NavLink>
   <NavLink to="/menu"><Icona nom="menu" size={18} />Més</NavLink>
  </nav>
  <div className="header-actions">
   <Link to="/recordatoris" className="quiet-action" aria-label="Recordatoris"><Icona nom="bell" size={19} /><span>Recordatoris</span></Link>
   <button className="quiet-action" onClick={() => { logout(); navigate('/login'); }} aria-label="Sortir"><Icona nom="logout" size={19} /><span>Sortir</span></button>
  </div>
 </div><div className="identity-bar"><span>Hola, <strong>{usuari?.nom}</strong></span>
 {usuari?.rol === 'ENCARREGAT' && <button className="view-toggle" aria-pressed={vista} onClick={() => { setVista(!vista); navigate('/dia-a-dia'); }}><Icona nom="user" size={16} />{vista ? 'Tornar a vista administrador' : 'Veure com a treballador'}</button>}
 </div></header>;
}
