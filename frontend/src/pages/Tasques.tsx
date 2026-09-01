import { useEffect, useState } from 'react';
import { getUsuariActual } from '../services/api';
import { Tasca, llistarTasques, crearTasca, canviarEstatTasca } from '../services/tasques';
import { Usuari, llistarUsuaris } from '../services/usuaris';
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
  const [assignatAId, setAssignatAId] = useState('');
  const [prioritat, setPrioritat] = useState<'BAIXA' | 'MITJANA' | 'ALTA'>('MITJANA');
  const [dataLimit, setDataLimit] = useState('');

  async function carregar() {
    setCarregant(true);
    try {
      const dades = await llistarTasques();
      setTasques(dades);
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

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await crearTasca({
        titol,
        descripcio: descripcio || undefined,
        assignatAId,
        prioritat,
        dataLimit: dataLimit || undefined,
      });
      setTitol('');
      setDescripcio('');
      setAssignatAId('');
      setPrioritat('MITJANA');
      setDataLimit('');
      setMostrarFormulari(false);
      carregar();
    } catch {
      setError('No s\'ha pogut crear la tasca');
    }
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

  if (carregant) return <p style={{ padding: 24, fontFamily: 'sans-serif' }}>Carregant tasques...</p>;

  const pendents = tasques.filter((t) => t.estat !== 'FETA');
  const fetes = tasques.filter((t) => t.estat === 'FETA');

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <BotoTornar />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Tasques</h1>
        {esEncarregat && (
          <button onClick={() => setMostrarFormulari(!mostrarFormulari)}>
            {mostrarFormulari ? 'Cancel·lar' : '+ Nova tasca'}
          </button>
        )}
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {mostrarFormulari && (
        <form
          onSubmit={handleCrear}
          style={{ border: '1px solid #ddd', padding: 16, marginBottom: 20, maxWidth: 420 }}
        >
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
            <label>Assignar a</label>
            <select
              value={assignatAId}
              onChange={(e) => setAssignatAId(e.target.value)}
              required
              style={{ width: '100%', padding: 6 }}
            >
              <option value="">Selecciona un usuari</option>
              {treballadors.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nom}
                </option>
              ))}
            </select>
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
          <button type="submit">Crear tasca</button>
        </form>
      )}

      <h3>Pendents ({pendents.length})</h3>
      {pendents.length === 0 && <p style={{ color: '#888' }}>No hi ha tasques pendents.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {pendents.map((t) => (
          <div key={t.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 14, maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <strong>{t.titol}</strong>
              <span style={{ fontSize: 12, color: colorPrioritat[t.prioritat] }}>{t.prioritat}</span>
            </div>
            {t.descripcio && <p style={{ fontSize: 13, color: '#555', margin: '6px 0' }}>{t.descripcio}</p>}
            <p style={{ fontSize: 12, color: '#888', margin: '4px 0 8px' }}>
              Assignat a {t.assignatA?.nom}
              {t.dataLimit && ` · Límit: ${new Date(t.dataLimit).toLocaleDateString('ca-ES')}`}
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
          <div key={t.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 10, maxWidth: 480, opacity: 0.6 }}>
            <span style={{ textDecoration: 'line-through' }}>{t.titol}</span>
            <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>— {t.assignatA?.nom}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
