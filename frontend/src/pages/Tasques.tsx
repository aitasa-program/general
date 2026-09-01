import { useEffect, useState } from 'react';
import { getUsuariActual } from '../services/api';
import { Tasca, llistarTasques, crearTasca, canviarEstatTasca } from '../services/tasques';
import { Usuari, llistarUsuaris } from '../services/usuaris';
import { RetenActual, obtenirRetenActual } from '../services/reten';
import { QuinzenaActual, obtenirQuinzenaActual } from '../services/quinzena';
import BotoTornar from '../components/BotoTornar';

const colorPrioritat: Record<string, string> = {
  BAIXA: '#888',
  MITJANA: '#b8860b',
  ALTA: '#c0392b',
};

export default function Tasques() {
  const usuariActual = getUsuariActual();
  const esEncarregat = usuariActual?.rol === 'ENCARREGAT';

  const [tasques, setTasques] = useState<Tasca[]>([]);
  const [treballadors, setTreballadors] = useState<Usuari[]>([]);
  const [carregant, setCarregant] = useState(true);
  const [error, setError] = useState('');
  const [mostrarFormulari, setMostrarFormulari] = useState(false);

  const [titol, setTitol] = useState('');
  const [descripcio, setDescripcio] = useState('');
  const [assignatsAIds, setAssignatsAIds] = useState<string[]>([]);
  const [assignatAlReten, setAssignatAlReten] = useState(false);
  const [assignatAQuinzena, setAssignatAQuinzena] = useState(false);
  const [prioritat, setPrioritat] = useState<'BAIXA' | 'MITJANA' | 'ALTA'>('MITJANA');
  const [dataLimit, setDataLimit] = useState('');
  const [repeticio, setRepeticio] = useState<'UNIC' | 'DIARIA' | 'SETMANAL'>('UNIC');
  const [reten, setReten] = useState<RetenActual | null>(null);
  const [quinzena, setQuinzena] = useState<QuinzenaActual | null>(null);

  async function carregar() {
    setCarregant(true);
    try {
      const dades = await llistarTasques();
      setTasques(dades);
      obtenirRetenActual().then(setReten).catch(() => setReten(null));
      obtenirQuinzenaActual().then(setQuinzena).catch(() => setQuinzena(null));
      if (esEncarregat) {
        const usuaris = await llistarUsuaris();
        setTreballadors(usuaris.filter((u) => u.actiu));
      }
    } catch {
      setError('No s\'han pogut carregar les tasques');
    } finally {
      setCarregant(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function toggleAssignat(id: string) {
    setAssignatsAIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (assignatsAIds.length === 0 && !assignatAlReten && !assignatAQuinzena) {
      setError('Selecciona almenys un usuari, el reté o la quinzena');
      return;
    }
    try {
      await crearTasca({
        titol,
        descripcio: descripcio || undefined,
        assignatsAIds,
        assignatAlReten,
        assignatAQuinzena,
        prioritat,
        dataLimit: dataLimit || undefined,
        repeticio,
      });
      setTitol('');
      setDescripcio('');
      setAssignatsAIds([]);
      setAssignatAlReten(false);
      setAssignatAQuinzena(false);
      setPrioritat('MITJANA');
      setDataLimit('');
      setRepeticio('UNIC');
      setMostrarFormulari(false);
      carregar();
    } catch {
      setError('No s\'ha pogut crear la tasca');
    }
  }

  function nomsAssignats(t: Tasca): string {
    const noms = t.assignatsA.map((u) => u.nom);
    if (t.assignatAlReten) noms.push(`Reté${reten?.usuari ? ` (${reten.usuari.nom})` : ''}`);
    if (t.assignatAQuinzena) noms.push(`Quinzena${quinzena?.usuari ? ` (${quinzena.usuari.nom})` : ''}`);
    return noms.join(', ');
  }

  async function handleCanviarEstat(id: string, nouEstat: string) {
    setTasques((prev) => prev.map((t) => (t.id === id ? { ...t, estat: nouEstat as any } : t)));
    try {
      await canviarEstatTasca(id, nouEstat);
    } catch {
      setError('No s\'ha pogut actualitzar la tasca');
      carregar();
    }
  }

  if (carregant) return <p className="page text-muted">Carregant tasques...</p>;

  const pendents = tasques.filter((t) => t.estat !== 'FETA');
  const fetes = tasques.filter((t) => t.estat === 'FETA');

  return (
    <div className="page">
      <BotoTornar />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Tasques</h1>
        {esEncarregat && (
          <button onClick={() => setMostrarFormulari(!mostrarFormulari)}>
            {mostrarFormulari ? 'Cancel·lar' : '+ Nova tasca'}
          </button>
        )}
      </div>

      {error && <p className="text-error">{error}</p>}

      {mostrarFormulari && (
        <form onSubmit={handleCrear} className="card" style={{ marginBottom: 20, maxWidth: 420 }}>
          <div style={{ marginBottom: 10 }}>
            <label>Títol</label>
            <input value={titol} onChange={(e) => setTitol(e.target.value)} required style={{ width: '100%', padding: 6 }} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label>Descripció (opcional)</label>
            <textarea
              value={descripcio}
              onChange={(e) => setDescripcio(e.target.value)}
              rows={2}
              style={{ width: '100%', padding: 6 }}
            />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label>Assignar a (pots seleccionar-ne més d'un)</label>
            <div style={{ border: '1px solid #ccc', borderRadius: 4, padding: 8, maxHeight: 160, overflowY: 'auto' }}>
              {treballadors.map((t) => (
                <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                  <input
                    type="checkbox"
                    checked={assignatsAIds.includes(t.id)}
                    onChange={() => toggleAssignat(t.id)}
                  />
                  {t.nom} ({t.rol === 'ENCARREGAT' ? 'Encarregat' : 'Treballador'})
                </label>
              ))}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderTop: '1px solid var(--c-border)', marginTop: 4 }}>
                <input type="checkbox" checked={assignatAlReten} onChange={(e) => setAssignatAlReten(e.target.checked)} />
                📞 Assignar al reté d'aquesta setmana{reten?.usuari ? ` (ara: ${reten.usuari.nom})` : ''}
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                <input type="checkbox" checked={assignatAQuinzena} onChange={(e) => setAssignatAQuinzena(e.target.checked)} />
                🔁 Assignar a la quinzena d'aquesta setmana{quinzena?.usuari ? ` (ara: ${quinzena.usuari.nom})` : ''}
              </label>
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label>Prioritat</label>
            <select value={prioritat} onChange={(e) => setPrioritat(e.target.value as any)} style={{ width: '100%', padding: 6 }}>
              <option value="BAIXA">Baixa</option>
              <option value="MITJANA">Mitjana</option>
              <option value="ALTA">Alta</option>
            </select>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label>Data límit (opcional)</label>
            <input
              type="date"
              value={dataLimit}
              onChange={(e) => setDataLimit(e.target.value)}
              style={{ width: '100%', padding: 6 }}
            />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label>Repetició</label>
            <select value={repeticio} onChange={(e) => setRepeticio(e.target.value as any)} style={{ width: '100%', padding: 6 }}>
              <option value="UNIC">Única</option>
              <option value="DIARIA">Diària</option>
              <option value="SETMANAL">Setmanal</option>
            </select>
          </div>
          <button type="submit">Crear tasca</button>
        </form>
      )}

      <h3>Pendents ({pendents.length})</h3>
      {pendents.length === 0 && <p className="text-muted">No hi ha tasques pendents.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {pendents.map((t) => (
          <div key={t.id} className="card" style={{ maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <strong>{t.titol}</strong>
              <span style={{ fontSize: 12, color: colorPrioritat[t.prioritat] }}>{t.prioritat}</span>
            </div>
            {t.descripcio && <p style={{ fontSize: 13, color: '#555', margin: '6px 0' }}>{t.descripcio}</p>}
            <p className="text-muted" style={{ fontSize: 12, margin: '4px 0 8px' }}>
              Assignat a {nomsAssignats(t)}
              {t.dataLimit && ` · Límit: ${new Date(t.dataLimit).toLocaleDateString('ca-ES')}`}
              {t.repeticio !== 'UNIC' && ` · Repeteix: ${t.repeticio === 'DIARIA' ? 'diàriament' : 'setmanalment'}`}
            </p>
            <select
              value={t.estat}
              onChange={(e) => handleCanviarEstat(t.id, e.target.value)}
              style={{ padding: 4 }}
            >
              <option value="PENDENT">Pendent</option>
              <option value="EN_CURS">En curs</option>
              <option value="FETA">Feta</option>
            </select>
          </div>
        ))}
      </div>

      <h3 style={{ marginTop: 24 }}>Fetes ({fetes.length})</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {fetes.map((t) => (
          <div key={t.id} className="card" style={{ padding: 10, maxWidth: 480, opacity: 0.6 }}>
            <span style={{ textDecoration: 'line-through' }}>{t.titol}</span>
            <span className="text-muted" style={{ fontSize: 12, marginLeft: 8 }}>— {nomsAssignats(t)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
