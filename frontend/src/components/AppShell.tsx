import { NavLink, Link, useLocation } from 'react-router-dom';
import Capcalera from './Capcalera';
import Icona from './Icona';
import { canvisPendentsOffline } from '../services/api';
import { useEffect, useState } from 'react';
export default function AppShell({ children }: { children: React.ReactNode }) {
 const { pathname } = useLocation();
 const more = !['/', '/dia-a-dia', '/fitxatge', '/registres-control', '/mostres', '/mapa'].includes(pathname);
 const [online, setOnline] = useState(navigator.onLine);
 const [pendents, setPendents] = useState(canvisPendentsOffline());
 const [avis, setAvis] = useState('');
 useEffect(() => {
  const actualitzarXarxa = () => setOnline(navigator.onLine);
  const actualitzarCua = () => setPendents(canvisPendentsOffline());
  const errorSync = (event: Event) => setAvis((event as CustomEvent<string>).detail);
  const cacheOffline = (event: Event) => {
   const data = new Date((event as CustomEvent<number>).detail).toLocaleString('ca-ES');
   setAvis(`Sense connexió. Es mostren dades desades el ${data}.`);
  };
  window.addEventListener('online', actualitzarXarxa);
  window.addEventListener('offline', actualitzarXarxa);
  window.addEventListener('aitasa:queue-change', actualitzarCua);
  window.addEventListener('aitasa:sync-error', errorSync);
  window.addEventListener('aitasa:offline-cache', cacheOffline);
  return () => {
   window.removeEventListener('online', actualitzarXarxa);
   window.removeEventListener('offline', actualitzarXarxa);
   window.removeEventListener('aitasa:queue-change', actualitzarCua);
   window.removeEventListener('aitasa:sync-error', errorSync);
   window.removeEventListener('aitasa:offline-cache', cacheOffline);
  };
 }, []);
 useEffect(() => { if (online) setAvis(''); }, [online]);
 return <div className="app-shell"><a className="skip-link" href="#contingut">Anar al contingut</a><Capcalera />
 {(!online || pendents > 0 || avis) && <div className={`network-notice${!online ? ' network-notice--offline' : ''}`} role="status">
  <span>{!online ? 'Sense connexió. Es poden consultar dades carregades anteriorment; només els canvis d’estat i les caselles de checklist es guardaran per sincronitzar.' : pendents ? `${pendents} canvi${pendents === 1 ? '' : 's'} pendent${pendents === 1 ? '' : 's'} de sincronitzar…` : avis}</span>
  {avis && online && <button onClick={() => setAvis('')} aria-label="Tancar avís">Tancar</button>}
 </div>}
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
