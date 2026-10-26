import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icona from '../components/Icona';
import { getUsuariActual } from '../services/api';
import { useVistaTreballador } from '../utils/vistaTreballador';
import { llistarTasques } from '../services/tasques';
import { llistarProductes } from '../services/inventari';
import { llistarVehicles } from '../services/vehicles';

export default function Dashboard() {
  const [vista] = useVistaTreballador();
  const admin = getUsuariActual()?.rol === 'ENCARREGAT' && !vista;
  const [resum, setResum] = useState<{ pendents: number; vençudes: number; stock: number; vehicles: number } | null>(null);

  useEffect(() => {
    let activa = true;
    const carregarResum = async () => {
      const [tasques, productes] = await Promise.all([llistarTasques().catch(() => []), llistarProductes().catch(() => [])]);
      const vehicles = admin ? await llistarVehicles().catch(() => []) : [];
      if (!activa) return;
      const avui = new Date();
      avui.setHours(0, 0, 0, 0);
      const termini = new Date(avui);
      termini.setDate(termini.getDate() + 30);
      setResum({
        pendents: tasques.filter((t) => t.estat !== 'FETA').length,
        vençudes: tasques.filter((t) => t.estat !== 'FETA' && t.dataLimit && new Date(t.dataLimit) < avui).length,
        stock: productes.filter((p) => p.quantitat <= p.stockMinim).length,
        vehicles: vehicles.filter((v) => [v.proximaItv, v.proximaRevisio].some((d) => d && new Date(d) <= termini)).length,
      });
    };
    void carregarResum();
    return () => { activa = false; };
  }, [admin]);

  return <div className="page menu-page">
    <h1>Més</h1><p className="page-subtitle">Accés ràpid a les eines d’AITASA.</p>
    {resum && <section className="attention-summary" aria-label="Avisos pendents">
      <Link to="/dia-a-dia"><strong>{resum.pendents}</strong><span>tasques pendents · {resum.vençudes} vençudes</span></Link>
      <Link to="/inventari"><strong>{resum.stock}</strong><span>productes amb stock baix</span></Link>
      {admin && <Link to="/vehicles"><strong>{resum.vehicles}</strong><span>revisions o ITV en 30 dies</span></Link>}
    </section>}
    <section className="module-section"><h2>Feina diària</h2><div className="module-grid">
      <Link className="module-card" to="/dia-a-dia"><Icona nom="calendar" size={30} /><strong>Dia a dia</strong><span>Tasques, checklists i formularis</span><Icona nom="arrow" size={18} /></Link>
      <Link className="module-card" to="/fitxatge"><Icona nom="clock" size={30} /><strong>Fitxatge</strong><span>Jornada i hores de RETÉN</span><Icona nom="arrow" size={18} /></Link>
      <Link className="module-card" to="/recordatoris"><Icona nom="bell" size={30} /><strong>Recordatoris</strong><span>Avisos i notificacions</span><Icona nom="arrow" size={18} /></Link>
      <Link className="module-card" to="/notes-personals"><Icona nom="note" size={30} /><strong>Les meves notes</strong><span>Notes i fotos privades, només teves</span><Icona nom="arrow" size={18} /></Link>
      <Link className="module-card" to="/avaries"><Icona nom="alert" size={30} /><strong>Avaries</strong><span>Registra-les i demana un diagnòstic a la IA</span><Icona nom="arrow" size={18} /></Link>
    </div></section>
    <section className="module-section"><h2>Magatzem i controls</h2><div className="module-grid">
      <Link className="module-card" to="/mostres"><Icona nom="file" size={30} /><strong>Mostres</strong><span>Recollides programades</span><Icona nom="arrow" size={18} /></Link>
      <Link className="module-card" to="/mapa"><Icona nom="map" size={30} /><strong>Mapa</strong><span>Xarxes, pous i comptadors</span><Icona nom="arrow" size={18} /></Link>
      <Link className="module-card" to="/registres-control"><Icona nom="file" size={30} /><strong>Registres de control</strong><span>Controls diaris i arxiu de PDF</span><Icona nom="arrow" size={18} /></Link>
      <Link className="module-card" to="/documentacio"><Icona nom="folder" size={30} /><strong>Documentació</strong><span>Carpetes i documents de consulta</span><Icona nom="arrow" size={18} /></Link>
      <Link className="module-card" to="/inventari"><Icona nom="box" size={30} /><strong>Magatzem</strong><span>Productes, existències i moviments</span><Icona nom="arrow" size={18} /></Link>
      <Link className="module-card" to="/comptadors"><Icona nom="gauge" size={30} /><strong>Comptadors</strong><span>Zones i empreses</span><Icona nom="arrow" size={18} /></Link>
      <Link className="module-card" to="/manteniment"><Icona nom="wrench" size={30} /><strong>Manteniment</strong><span>Pla de manteniment preventiu i calendari</span><Icona nom="arrow" size={18} /></Link>
    </div></section>
    {admin && <section className="module-section"><h2>Administració</h2><div className="module-grid">
      <Link className="module-card" to="/tasques-reten"><Icona nom="list" size={30} /><strong>Tasques RETÉN</strong><span>Checklist setmanal de qui està de retén</span><Icona nom="arrow" size={18} /></Link>
      <Link className="module-card" to="/tasques-quinzenals"><Icona nom="calendar" size={30} /><strong>Quinzenals A</strong><span>Checklist de la quinzena A</span><Icona nom="arrow" size={18} /></Link>
      <Link className="module-card" to="/tasques-quinzenals-b"><Icona nom="calendar" size={30} /><strong>Quinzenals B</strong><span>Checklist de la quinzena B</span><Icona nom="arrow" size={18} /></Link>
      <Link className="module-card" to="/vehicles"><Icona nom="car" size={30} /><strong>ITV i revisions</strong><span>Dates dels vehicles de l’empresa</span><Icona nom="arrow" size={18} /></Link>
      <Link className="module-card" to="/usuaris"><Icona nom="users" size={30} /><strong>Gestionar usuaris</strong><span>Altes, rols i contrasenyes</span><Icona nom="arrow" size={18} /></Link>
      <Link className="module-card" to="/ia-modificacions"><Icona nom="sparkle" size={30} /><strong>Modificacions APP</strong><span>Demanar canvis a l’app amb IA</span><Icona nom="arrow" size={18} /></Link>
    </div></section>}
  </div>;
}
