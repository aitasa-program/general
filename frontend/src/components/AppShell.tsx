import { NavLink, Link, useLocation } from 'react-router-dom';
import Capcalera from './Capcalera';
import Icona from './Icona';
import { getUsuariActual } from '../services/api';
import { useVistaTreballador } from '../utils/vistaTreballador';
export default function AppShell({ children }: { children: React.ReactNode }) {
 const [vista] = useVistaTreballador();
 const admin = getUsuariActual()?.rol === 'ENCARREGAT' && !vista;
 const { pathname } = useLocation();
 const more = !['/', '/dia-a-dia', '/fitxatge'].includes(pathname);
 return <div className="app-shell"><a className="skip-link" href="#contingut">Anar al contingut</a><Capcalera />
 <main id="contingut">{children}</main>
 {admin && <footer className="management-nav" aria-label="Administració">
  <Link to="/tasques-reten"><Icona nom="list" />Tasques RETÉN</Link>
  <Link to="/tasques-quinzenals"><Icona nom="calendar" />Quinzenals A</Link>
  <Link to="/tasques-quinzenals-b"><Icona nom="calendar" />Quinzenals B</Link>
  <Link to="/vehicles"><Icona nom="car" />ITV i revisions</Link>
  <Link to="/usuaris"><Icona nom="users" />Gestionar usuaris</Link>
 </footer>}
 <nav className="mobile-nav" aria-label="Navegació principal">
  <NavLink to="/dia-a-dia"><Icona nom="calendar" />Dia a dia</NavLink>
  <NavLink to="/fitxatge"><Icona nom="clock" />Fitxatge</NavLink>
  <Link to="/menu" className={more ? 'active' : ''} aria-current={more ? 'page' : undefined}><Icona nom="menu" />Més</Link>
 </nav></div>;
}
