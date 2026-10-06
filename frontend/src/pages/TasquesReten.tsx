import { useEffect, useState } from 'react';
import {
  Checklist,
  ChecklistHistoric,
  afegirItem,
  crearChecklist,
  editarTextItem,
  eliminarChecklist,
  eliminarItem,
  llistarChecklists,
  llistarHistoricChecklists,
  marcarItem,
} from '../services/checklists';
import { Reten, RetenActual, assignarReten, eliminarReten, llistarRetens, obtenirRetenActual } from '../services/reten';
import { Usuari, llistarUsuaris } from '../services/usuaris';
import { combinarDataHora, sufixHora } from '../utils/dataHora';
import BotoTornar from '../components/BotoTornar';
import FilaItemChecklist from '../components/FilaItemChecklist';

function etiquetaSetmana(setmanaInici: string) {
  const inici = new Date(setmanaInici);
  const fi = new Date(inici);
  fi.setDate(inici.getDate() + 6);
  return `${inici.toLocaleDateString('ca-ES')} – ${fi.toLocaleDateString('ca-ES')}`;
}

const NOMS_DIA = ['Diumenge', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte'];

function ordreDiaSetmana(iso: string) {
  const dia = new Date(iso).getDay(); // 0=diumenge
  return (dia + 6) % 7; // dilluns primer
}

export default function TasquesReten() {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [reten, setReten] = useState<RetenActual | null>(null);
  const [usuaris, setUsuaris] = useState<Usuari[]>([]);
  const [retens, setRetens] = useState<Reten[]>([]);
  const [historic, setHistoric] = useState<ChecklistHistoric[]>([]);
  const [carregant, setCarregant] = useState(true);
  const [error, setError] = useState('');

  const [dataAssignacio, setDataAssignacio] = useState('');
  const [usuariAssignacio, setUsuariAssignacio] = useState('');

  const [nousItems, setNousItems] = useState<Record<string, string>>({});

  const [mostrarNouDia, setMostrarNouDia] = useState(false);
  const [nomNouDia, setNomNouDia] = useState('');
  const [dataNouDia, setDataNouDia] = useState('');
  const [horaNouDia, setHoraNouDia] = useState('');
  const [itemsNouDia, setItemsNouDia] = useState('');

  async function carregar() {
    setCarregant(true);
    try {
      const [dadesChecklists, dadesReten, dadesUsuaris, dadesRetens, dadesHistoric] = await Promise.all([
        llistarChecklists(),
        obtenirRetenActual(),
        llistarUsuaris(),
        llistarRetens(),
        llistarHistoricChecklists('reten'),
      ]);
      setChecklists(
        dadesChecklists
          .filter((c) => c.assignatAlReten)
          .sort((a, b) => ordreDiaSetmana(a.data) - ordreDiaSetmana(b.data))
      );
      setReten(dadesReten);
      setUsuaris(dadesUsuaris.filter((u) => u.actiu));
      setRetens(dadesRetens);
      setHistoric(dadesHistoric);
    } catch {
      setError("No s'han pogut carregar les tasques de RETÉN");
    } finally {
      setCarregant(false);
    }
  }

  async function handleAssignar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!dataAssignacio || !usuariAssignacio) {
      setError('Selecciona una data i un usuari');
      return;
    }
    try {
      await assignarReten(dataAssignacio, usuariAssignacio);
      setDataAssignacio('');
      setUsuariAssignacio('');
      carregar();
    } catch {
      setError("No s'ha pogut assignar el RETÉN");
    }
  }

  async function handleEliminarAssignacio(id: string) {
    try {
      await eliminarReten(id);
      carregar();
    } catch {
      setError("No s'ha pogut eliminar l'assignació");
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
        data: combinarDataHora(dataNouDia, horaNouDia),
      });
      setNomNouDia('');
      setDataNouDia('');
      setHoraNouDia('');
      setItemsNouDia('');
      setMostrarNouDia(false);
      carregar();
    } catch {
      setError("No s'ha pogut crear el dia");
    }
  }

  if (carregant) return <p className="page text-muted">Carregant tasques de RETÉN...</p>;

  return (
    <div className="page">
      <BotoTornar />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Tasques RETÉN</h1>
        <button onClick={() => setMostrarNouDia(!mostrarNouDia)}>
          {mostrarNouDia ? 'Cancel·lar' : '+ Nou dia'}
        </button>
      </div>

      <p className="text-muted" style={{ fontSize: 13 }}>
        Tasques que fa qui estigui de RETÉN cada setmana{reten?.usuari ? ` — ara mateix: ${reten.usuari.nom}` : ''}.
        Es repeteixen automàticament cada setmana; només cal afegir o treure ítems aquí quan calgui.
      </p>

      {error && <p className="text-error">{error}</p>}

      <h2 style={{ fontSize: 18 }}>Qui està de RETÉN cada setmana</h2>
      <form onSubmit={handleAssignar} className="card" style={{ marginBottom: 16, width: '100%' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <label>Data (qualsevol dia de la setmana)</label>
            <input type="date" value={dataAssignacio} onChange={(e) => setDataAssignacio(e.target.value)} style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 150 }}>
            <label>Usuari de RETÉN</label>
            <select value={usuariAssignacio} onChange={(e) => setUsuariAssignacio(e.target.value)} style={{ width: '100%' }}>
              <option value="">Selecciona...</option>
              {usuaris.map((u) => (
                <option key={u.id} value={u.id}>{u.nom}</option>
              ))}
            </select>
          </div>
        </div>
        <button type="submit" style={{ marginTop: 10 }}>Assignar RETÉN</button>
      </form>

      {retens.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {retens.map((r) => (
            <div
              key={r.id}
              className="card"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: 10 }}
            >
              <span style={{ fontSize: 13 }}>
                <strong>{etiquetaSetmana(r.setmanaInici)}</strong> · {r.usuari.nom}
              </span>
              <button onClick={() => handleEliminarAssignacio(r.id)} style={{ color: 'var(--c-error)', fontSize: 12 }}>
                Eliminar
              </button>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ fontSize: 18 }}>Tasques del RETÉN</h2>

      {mostrarNouDia && (
        <form onSubmit={handleCrearNouDia} className="card" style={{ marginBottom: 20, width: '100%' }}>
          <div style={{ marginBottom: 10 }}>
            <label>Nom (opcional)</label>
            <input value={nomNouDia} onChange={(e) => setNomNouDia(e.target.value)} placeholder="Tasques Setmanals" style={{ width: '100%' }} />
          </div>
          <div style={{ marginBottom: 10, display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label>Dia de la setmana (qualsevol data d'aquell dia)</label>
              <input type="date" value={dataNouDia} onChange={(e) => setDataNouDia(e.target.value)} required style={{ width: '100%' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label>Hora (opcional)</label>
              <input type="time" value={horaNouDia} onChange={(e) => setHoraNouDia(e.target.value)} style={{ width: '100%' }} />
            </div>
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
          <button type="submit">Crear dia de RETÉN</button>
        </form>
      )}

      {checklists.length === 0 ? (
        <p className="text-muted">Encara no hi ha cap tasca de RETÉN configurada.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {checklists.map((c) => {
            const fetes = c.items.filter((i) => i.marcat).length;
            return (
              <div key={c.id} className="card" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <strong>{NOMS_DIA[new Date(c.data).getDay()]}{sufixHora(c.data)}</strong>
                  <button onClick={() => handleEliminarDia(c.id)} style={{ color: 'var(--c-error)', fontSize: 12 }}>
                    Eliminar dia
                  </button>
                </div>
                <p className="text-muted" style={{ fontSize: 12, margin: '2px 0 10px' }}>
                  {c.nom} · Li toca a: <strong>{c.retenResolt?.nom || 'ningú assignat aquesta setmana'}</strong> · {fetes}/{c.items.length} fets
                </p>

                {c.items.map((item) => (
                  <FilaItemChecklist
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

      <h2 style={{ fontSize: 18, marginTop: 32 }}>Setmanes anteriors</h2>
      <p className="text-muted" style={{ fontSize: 13 }}>
        Es guarda sempre una còpia de cada dia abans de reiniciar-lo, perquè quedi constància de qui ho va fer.
      </p>

      {historic.length === 0 ? (
        <p className="text-muted">Encara no hi ha cap setmana arxivada.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {historic.map((h) => {
            const fetes = h.items.filter((i) => i.marcat).length;
            return (
              <div key={h.id} className="card" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 6 }}>
                  <strong>{NOMS_DIA[new Date(h.data).getDay()]} {new Date(h.data).toLocaleDateString('ca-ES')}</strong>
                  <span className="text-muted" style={{ fontSize: 12 }}>{fetes}/{h.items.length} fets</span>
                </div>
                <p className="text-muted" style={{ fontSize: 12, margin: '2px 0 8px' }}>
                  {h.nom} · Ho va fer: <strong>{h.responsableNom || 'ningú assignat aquella setmana'}</strong>
                </p>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                  {h.items.map((it, idx) => (
                    <li key={idx} style={{ color: it.marcat ? 'var(--c-text)' : 'var(--c-text-muted)' }}>
                      {it.marcat ? '✓' : '✗'} {it.text}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
