import { NavLink, Link, useLocation } from 'react-router-dom';
import Capcalera from './Capcalera';
import Icona from './Icona';
export default function AppShell({ children }: { children: React.ReactNode }) {
 const { pathname } = useLocation();
 const more = !['/', '/dia-a-dia', '/fitxatge', '/registres-control', '/mostres', '/mapa'].includes(pathname);
 return <div className="app-shell"><a className="skip-link" href="#contingut">Anar al contingut</a><Capcalera />
 <main id="contingut">{children}</main>
 <nav className="mobile-nav" aria-label="Navegació principal">
  <NavLink to="/dia-a-dia"><Icona nom="calendar" />Dia a dia</NavLink>
  <NavLink to="/fitxatge"><Icona nom="clock" />Fitxatge</NavLink>
  <NavLink to="/registres-control"><Icona nom="list" />Registres</NavLink>
  <NavLink to="/mostres"><Icona nom="file" />Mostres</NavLink>
  <NavLink to="/mapa"><Icona nom="map" />Mapa</NavLink>
  <Link to="/menu" className={more ? 'active' : ''} aria-current={more ? 'page' : undefined}><Icona nom="menu" />Més</Link>
 </nav></div>;
}
