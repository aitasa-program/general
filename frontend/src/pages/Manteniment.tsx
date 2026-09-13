import BotoTornar from '../components/BotoTornar';
import Icona from '../components/Icona';

export default function Manteniment() {
  return (
    <div className="page">
      <BotoTornar />
      <h1>Manteniment</h1>
      <p className="page-subtitle">Pla de manteniment i registres a tenir al dia.</p>
      <div className="empty-state">
        <Icona nom="wrench" size={40} />
        <p>Encara no hi ha cap pla de manteniment carregat.</p>
        <p>En quan tinguem el PDF del pla i dels registres, aquí podràs veure els elements a revisar, la seva periodicitat i marcar-los com a fets.</p>
      </div>
    </div>
  );
}
