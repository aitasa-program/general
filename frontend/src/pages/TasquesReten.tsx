import { useEffect, useState } from 'react';
import {
  Checklist,
  afegirItem,
  crearChecklist,
  editarTextItem,
  eliminarChecklist,
  eliminarItem,
  llistarChecklists,
  marcarItem,
} from '../services/checklists';
import { RetenActual, obtenirRetenActual } from '../services/reten';
import BotoTornar from '../components/BotoTornar';

const NOMS_DIA = ['Diumenge', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte'];

function ordreDiaSetmana(iso: string) {
  const dia = new Date(iso).getDay(); // 0=diumenge
  return (dia + 6) % 7; // dilluns primer
}

interface FilaItemProps {
  item: Checklist['items'][number];
  onToggle: () => void;
  onGuardarText: (text: string) => void;
  onEliminar: () => void;
}

function FilaItem({ item, onToggle, onGuardarText, onEliminar }: FilaItemProps) {
  const [editant, setEditant] = useState(false);
  const [text, setText] = useState(item.text);

  if (editant) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0' }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{ flex: 1 }}
          autoFocus
        />
        <button
          onClick={() => {
            onGuardarText(text);
            setEditant(false);
          }}
        >
          Desar
        </button>
        <button onClick={() => { setText(item.text); setEditant(false); }}>Cancel·lar</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
      <input type="checkbox" checked={item.marcat} onChange={onToggle} />
      <span
        onClick={() => setEditant(true)}
        style={{
          flex: 1,
          cursor: 'pointer',
          textDecoration: item.marcat ? 'line-through' : 'none',
          color: item.marcat ? '#aaa' : 'inherit',
        }}
        title="Clica per editar"
      >
        {item.text}
      </span>
      <button onClick={onEliminar} style={{ color: 'var(--c-error)', padding: '2px 8px' }}>✕</button>
    </div>
  );
}

export default function TasquesReten() {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [reten, setReten] = useState<RetenActual | null>(null);
  const [carregant, setCarregant] = useState(true);
  const [error, setError] = useState('');

  const [nousItems, setNousItems] = useState<Record<string, string>>({});

  const [mostrarNouDia, setMostrarNouDia] = useState(false);
  const [nomNouDia, setNomNouDia] = useState('');
  const [dataNouDia, setDataNouDia] = useState('');
  const [itemsNouDia, setItemsNouDia] = useState('');

  async function carregar() {
    setCarregant(true);
    try {
      const [dadesChecklists, dadesReten] = await Promise.all([llistarChecklists(), obtenirRetenActual()]);
      setChecklists(
        dadesChecklists
          .filter((c) => c.assignatAlReten)
          .sort((a, b) => ordreDiaSetmana(a.data) - ordreDiaSetmana(b.data))
      );
      setReten(dadesReten);
    } catch {
      setError("No s'han pogut carregar les tasques de reté");
    } finally {
      setCarregant(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function handleToggle(itemId: string, marcatActual: boolean) {
    setChecklists((prev) =>
      prev.map((c) => ({
        ...c,
        items: c.items.map((it) => (it.id === itemId ? { ...it, marcat: !marcatActual } : it)),
      }))
    );
    try {
      await marcarItem(itemId, !marcatActual);
    } catch {
      setError("No s'ha pogut actualitzar l'ítem");
      carregar();
    }
  }

  async function handleGuardarText(itemId: string, text: string) {
    try {
      await editarTextItem(itemId, text);
      carregar();
    } catch {
      setError("No s'ha pogut desar el text");
    }
  }

  async function handleEliminarItem(itemId: string) {
    try {
      await eliminarItem(itemId);
      carregar();
    } catch {
      setError("No s'ha pogut eliminar l'ítem");
    }
  }

  async function handleAfegirItem(checklistId: string) {
    const text = (nousItems[checklistId] || '').trim();
    if (!text) return;
    try {
      await afegirItem(checklistId, text);
      setNousItems((prev) => ({ ...prev, [checklistId]: '' }));
      carregar();
    } catch {
      setError("No s'ha pogut afegir l'ítem");
    }
  }

  async function handleEliminarDia(id: string) {
    try {
      await eliminarChecklist(id);
      carregar();
    } catch {
      setError("No s'ha pogut eliminar el dia");
    }
  }

  async function handleCrearNouDia(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const items = itemsNouDia.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!dataNouDia || items.length === 0) {
      setError('Indica un dia i almenys un ítem');
      return;
    }
    try {
      await crearChecklist({
        nom: nomNouDia || 'Tasques Setmanals',
        assignatAlReten: true,
        frequencia: 'SETMANAL',
        items,
        data: new Date(dataNouDia + 'T12:00:00').toISOString(),
      });
      setNomNouDia('');
      setDataNouDia('');
      setItemsNouDia('');
      setMostrarNouDia(false);
      carregar();
    } catch {
      setError("No s'ha pogut crear el dia");
    }
  }

  if (carregant) return <p className="page text-muted">Carregant tasques de reté...</p>;

  return (
    <div className="page">
      <BotoTornar />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Tasques Reté</h1>
        <button onClick={() => setMostrarNouDia(!mostrarNouDia)}>
          {mostrarNouDia ? 'Cancel·lar' : '+ Nou dia'}
        </button>
      </div>

      <p className="text-muted" style={{ fontSize: 13 }}>
        Tasques que fa qui estigui de reté cada setmana{reten?.usuari ? ` — ara mateix: ${reten.usuari.nom}` : ''}.
        Es repeteixen automàticament cada setmana; només cal afegir o treure ítems aquí quan calgui.
      </p>

      {error && <p className="text-error">{error}</p>}

      {mostrarNouDia && (
        <form onSubmit={handleCrearNouDia} className="card" style={{ marginBottom: 20, maxWidth: 420 }}>
          <div style={{ marginBottom: 10 }}>
            <label>Nom (opcional)</label>
            <input value={nomNouDia} onChange={(e) => setNomNouDia(e.target.value)} placeholder="Tasques Setmanals" style={{ width: '100%' }} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label>Dia de la setmana (qualsevol data d'aquell dia)</label>
            <input type="date" value={dataNouDia} onChange={(e) => setDataNouDia(e.target.value)} required style={{ width: '100%' }} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label>Ítems (un per línia)</label>
            <textarea
              value={itemsNouDia}
              onChange={(e) => setItemsNouDia(e.target.value)}
              rows={3}
              placeholder={'Control XC: CLOR SD\nLegionela: BONAVISTA'}
              style={{ width: '100%' }}
              required
            />
          </div>
          <button type="submit">Crear dia de reté</button>
        </form>
      )}

      {checklists.length === 0 ? (
        <p className="text-muted">Encara no hi ha cap tasca de reté configurada.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {checklists.map((c) => {
            const fetes = c.items.filter((i) => i.marcat).length;
            return (
              <div key={c.id} className="card" style={{ maxWidth: 480 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <strong>{NOMS_DIA[new Date(c.data).getDay()]}</strong>
                  <button onClick={() => handleEliminarDia(c.id)} style={{ color: 'var(--c-error)', fontSize: 12 }}>
                    Eliminar dia
                  </button>
                </div>
                <p className="text-muted" style={{ fontSize: 12, margin: '2px 0 10px' }}>
                  {c.nom} · {fetes}/{c.items.length} fets
                </p>

                {c.items.map((item) => (
                  <FilaItem
                    key={item.id}
                    item={item}
                    onToggle={() => handleToggle(item.id, item.marcat)}
                    onGuardarText={(text) => handleGuardarText(item.id, text)}
                    onEliminar={() => handleEliminarItem(item.id)}
                  />
                ))}

                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <input
                    value={nousItems[c.id] || ''}
                    onChange={(e) => setNousItems((prev) => ({ ...prev, [c.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAfegirItem(c.id))}
                    placeholder="Nou ítem..."
                    style={{ flex: 1 }}
                  />
                  <button onClick={() => handleAfegirItem(c.id)}>+ Afegir</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
