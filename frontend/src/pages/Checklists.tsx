import { useEffect, useState } from 'react';
import { getUsuariActual } from '../services/api';
import { Checklist, llistarChecklists, crearChecklist, marcarItem } from '../services/checklists';
import { Usuari, llistarUsuaris } from '../services/usuaris';
import BotoTornar from '../components/BotoTornar';

const etiquetaFreq: Record<string, string> = {
  DIARIA: 'Diària',
  SETMANAL: 'Setmanal',
  PUNTUAL: 'Puntual',
};

export default function Checklists() {
  const usuariActual = getUsuariActual();
  const esEncarregat = usuariActual?.rol === 'ENCARREGAT';

  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [treballadors, setTreballadors] = useState<Usuari[]>([]);
  const [carregant, setCarregant] = useState(true);
  const [error, setError] = useState('');
  const [mostrarFormulari, setMostrarFormulari] = useState(false);

  const [nom, setNom] = useState('');
  const [assignatAId, setAssignatAId] = useState('');
  const [frequencia, setFrequencia] = useState<'DIARIA' | 'SETMANAL' | 'PUNTUAL'>('PUNTUAL');
  const [itemsText, setItemsText] = useState('');

  async function carregar() {
    setCarregant(true);
    try {
      const dades = await llistarChecklists();
      setChecklists(dades);
      if (esEncarregat) {
        const usuaris = await llistarUsuaris();
        setTreballadors(usuaris.filter((u) => u.actiu));
      }
    } catch {
      setError('No s\'han pogut carregar les checklists');
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
    const items = itemsText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (items.length === 0) {
      setError('Afegeix almenys un ítem a la checklist');
      return;
    }
    try {
      await crearChecklist({ nom, assignatAId, frequencia, items });
      setNom('');
      setAssignatAId('');
      setFrequencia('PUNTUAL');
      setItemsText('');
      setMostrarFormulari(false);
      carregar();
    } catch {
      setError('No s\'ha pogut crear la checklist');
    }
  }

  async function handleToggleItem(itemId: string, marcatActual: boolean) {
    setChecklists((prev) =>
      prev.map((c) => ({
        ...c,
        items: c.items.map((it) => (it.id === itemId ? { ...it, marcat: !marcatActual } : it)),
      }))
    );
    try {
      await marcarItem(itemId, !marcatActual);
    } catch {
      setError('No s\'ha pogut actualitzar l\'ítem');
      carregar();
    }
  }

  if (carregant) return <p className="page text-muted">Carregant checklists...</p>;

  return (
    <div className="page">
      <BotoTornar />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Checklists</h1>
        {esEncarregat && (
          <button onClick={() => setMostrarFormulari(!mostrarFormulari)}>
            {mostrarFormulari ? 'Cancel·lar' : '+ Nova checklist'}
          </button>
        )}
      </div>

      {error && <p className="text-error">{error}</p>}

      {mostrarFormulari && (
        <form onSubmit={handleCrear} className="card" style={{ marginBottom: 20, maxWidth: 420 }}>
          <div style={{ marginBottom: 10 }}>
            <label>Nom de la checklist</label>
            <input value={nom} onChange={(e) => setNom(e.target.value)} required style={{ width: '100%', padding: 6 }} />
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
                  {t.nom} ({t.rol === 'ENCARREGAT' ? 'Encarregat' : 'Treballador'})
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label>Freqüència</label>
            <select
              value={frequencia}
              onChange={(e) => setFrequencia(e.target.value as any)}
              style={{ width: '100%', padding: 6 }}
            >
              <option value="PUNTUAL">Puntual</option>
              <option value="DIARIA">Diària</option>
              <option value="SETMANAL">Setmanal</option>
            </select>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label>Ítems (un per línia)</label>
            <textarea
              value={itemsText}
              onChange={(e) => setItemsText(e.target.value)}
              rows={4}
              placeholder={'Comprovar temperatura\nRevisar stock\nTancar portes'}
              style={{ width: '100%', padding: 6 }}
              required
            />
          </div>
          <button type="submit">Crear checklist</button>
        </form>
      )}

      {checklists.length === 0 && <p className="text-muted">No hi ha checklists per mostrar.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {checklists.map((c) => {
          const fetes = c.items.filter((i) => i.marcat).length;
          return (
            <div key={c.id} className="card" style={{ maxWidth: 480 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <strong>{c.nom}</strong>
                <span className="text-muted" style={{ fontSize: 12 }}>{etiquetaFreq[c.frequencia]}</span>
              </div>
              <p className="text-muted" style={{ fontSize: 13, margin: '4px 0 10px' }}>
                Assignat a {c.assignatA?.nom} · {fetes}/{c.items.length} fets
              </p>
              {c.items.map((item) => (
                <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                  <input
                    type="checkbox"
                    checked={item.marcat}
                    onChange={() => handleToggleItem(item.id, item.marcat)}
                  />
                  <span style={{ textDecoration: item.marcat ? 'line-through' : 'none', color: item.marcat ? '#aaa' : 'inherit' }}>
                    {item.text}
                  </span>
                </label>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
