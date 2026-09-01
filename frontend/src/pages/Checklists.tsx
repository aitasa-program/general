import { useEffect, useState } from 'react';
import { getUsuariActual } from '../services/api';
import {
  Checklist,
  crearChecklist,
  editarChecklist,
  eliminarChecklist,
  llistarChecklists,
  marcarItem,
} from '../services/checklists';
import { Usuari, llistarUsuaris } from '../services/usuaris';
import { RetenActual, obtenirRetenActual } from '../services/reten';
import { QuinzenaActual, obtenirQuinzenaActual } from '../services/quinzena';
import { QuinzenaBActual, obtenirQuinzenaBActual } from '../services/quinzenaB';
import { aDataInput, aHoraInput, combinarDataHora, sufixHora } from '../utils/dataHora';
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
  const [reten, setReten] = useState<RetenActual | null>(null);
  const [quinzena, setQuinzena] = useState<QuinzenaActual | null>(null);
  const [quinzenaB, setQuinzenaB] = useState<QuinzenaBActual | null>(null);
  const [carregant, setCarregant] = useState(true);
  const [error, setError] = useState('');
  const [mostrarFormulari, setMostrarFormulari] = useState(false);

  const [nom, setNom] = useState('');
  const [assignatAId, setAssignatAId] = useState('');
  const [assignatAlReten, setAssignatAlReten] = useState(false);
  const [assignatAQuinzena, setAssignatAQuinzena] = useState(false);
  const [assignatAQuinzenaB, setAssignatAQuinzenaB] = useState(false);
  const [frequencia, setFrequencia] = useState<'DIARIA' | 'SETMANAL' | 'PUNTUAL'>('PUNTUAL');
  const [dataChecklist, setDataChecklist] = useState('');
  const [horaChecklist, setHoraChecklist] = useState('');
  const [itemsText, setItemsText] = useState('');

  const [editantId, setEditantId] = useState<string | null>(null);
  const [editNom, setEditNom] = useState('');
  const [editAssignatAId, setEditAssignatAId] = useState('');
  const [editAssignatAlReten, setEditAssignatAlReten] = useState(false);
  const [editAssignatAQuinzena, setEditAssignatAQuinzena] = useState(false);
  const [editAssignatAQuinzenaB, setEditAssignatAQuinzenaB] = useState(false);
  const [editFrequencia, setEditFrequencia] = useState<'DIARIA' | 'SETMANAL' | 'PUNTUAL'>('PUNTUAL');
  const [editData, setEditData] = useState('');
  const [editHora, setEditHora] = useState('');

  async function carregar() {
    setCarregant(true);
    try {
      const dades = await llistarChecklists();
      setChecklists(dades.filter((c) => !c.assignatAlReten && !c.assignatAQuinzena && !c.assignatAQuinzenaB));
      obtenirRetenActual().then(setReten).catch(() => setReten(null));
      obtenirQuinzenaActual().then(setQuinzena).catch(() => setQuinzena(null));
      obtenirQuinzenaBActual().then(setQuinzenaB).catch(() => setQuinzenaB(null));
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
    if (!assignatAId && !assignatAlReten && !assignatAQuinzena && !assignatAQuinzenaB) {
      setError('Selecciona un usuari, el retén o una quinzena');
      return;
    }
    try {
      await crearChecklist({
        nom,
        assignatAId: assignatAId || undefined,
        assignatAlReten,
        assignatAQuinzena,
        assignatAQuinzenaB,
        frequencia,
        items,
        data: dataChecklist ? combinarDataHora(dataChecklist, horaChecklist) : undefined,
      });
      setNom('');
      setAssignatAId('');
      setAssignatAlReten(false);
      setAssignatAQuinzena(false);
      setAssignatAQuinzenaB(false);
      setFrequencia('PUNTUAL');
      setDataChecklist('');
      setHoraChecklist('');
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

  function obrirEdicio(c: Checklist) {
    setEditantId(c.id);
    setEditNom(c.nom);
    setEditAssignatAId(c.assignatAId || '');
    setEditAssignatAlReten(c.assignatAlReten);
    setEditAssignatAQuinzena(c.assignatAQuinzena);
    setEditAssignatAQuinzenaB(c.assignatAQuinzenaB);
    setEditFrequencia(c.frequencia);
    setEditData(aDataInput(c.data));
    setEditHora(aHoraInput(c.data));
  }

  async function handleGuardarEdicio(e: React.FormEvent) {
    e.preventDefault();
    if (!editantId) return;
    setError('');
    if (!editAssignatAId && !editAssignatAlReten && !editAssignatAQuinzena && !editAssignatAQuinzenaB) {
      setError('Selecciona un usuari, el retén o una quinzena');
      return;
    }
    try {
      await editarChecklist(editantId, {
        nom: editNom,
        assignatAId: editAssignatAlReten || editAssignatAQuinzena || editAssignatAQuinzenaB ? null : editAssignatAId,
        assignatAlReten: editAssignatAlReten,
        assignatAQuinzena: editAssignatAQuinzena,
        assignatAQuinzenaB: editAssignatAQuinzenaB,
        frequencia: editFrequencia,
        data: combinarDataHora(editData, editHora),
      });
      setEditantId(null);
      carregar();
    } catch {
      setError('No s\'ha pogut desar els canvis');
    }
  }

  async function handleEliminar(id: string) {
    try {
      await eliminarChecklist(id);
      carregar();
    } catch {
      setError('No s\'ha pogut eliminar la checklist');
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
            <input value={nom} onChange={(e) => setNom(e.target.value)} required style={{ width: '100%' }} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label>Assignar a</label>
            <select
              value={assignatAId}
              onChange={(e) => setAssignatAId(e.target.value)}
              disabled={assignatAlReten || assignatAQuinzena || assignatAQuinzenaB}
              style={{ width: '100%' }}
            >
              <option value="">Selecciona un usuari</option>
              {treballadors.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nom} ({t.rol === 'ENCARREGAT' ? 'Encarregat' : 'Treballador'})
                </option>
              ))}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontWeight: 400 }}>
              <input
                type="checkbox"
                checked={assignatAlReten}
                onChange={(e) => {
                  setAssignatAlReten(e.target.checked);
                  if (e.target.checked) { setAssignatAId(''); setAssignatAQuinzena(false); setAssignatAQuinzenaB(false); }
                }}
              />
              📞 Assignar al retén d'aquesta setmana{reten?.usuari ? ` (ara: ${reten.usuari.nom})` : ''}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontWeight: 400 }}>
              <input
                type="checkbox"
                checked={assignatAQuinzena}
                onChange={(e) => {
                  setAssignatAQuinzena(e.target.checked);
                  if (e.target.checked) { setAssignatAId(''); setAssignatAlReten(false); setAssignatAQuinzenaB(false); }
                }}
              />
              🔁 Assignar a la quinzena A d'aquesta setmana{quinzena?.usuari ? ` (ara: ${quinzena.usuari.nom})` : ''}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontWeight: 400 }}>
              <input
                type="checkbox"
                checked={assignatAQuinzenaB}
                onChange={(e) => {
                  setAssignatAQuinzenaB(e.target.checked);
                  if (e.target.checked) { setAssignatAId(''); setAssignatAlReten(false); setAssignatAQuinzena(false); }
                }}
              />
              🔂 Assignar a la quinzena B d'aquesta setmana{quinzenaB?.usuari ? ` (ara: ${quinzenaB.usuari.nom})` : ''}
            </label>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label>Freqüència / repetició</label>
            <select
              value={frequencia}
              onChange={(e) => setFrequencia(e.target.value as any)}
              style={{ width: '100%' }}
            >
              <option value="PUNTUAL">Puntual (no es repeteix)</option>
              <option value="DIARIA">Diària</option>
              <option value="SETMANAL">Setmanal (mateix dia cada setmana)</option>
            </select>
          </div>
          <div style={{ marginBottom: 10, display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label>Dia (opcional, per defecte avui)</label>
              <input type="date" value={dataChecklist} onChange={(e) => setDataChecklist(e.target.value)} style={{ width: '100%' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label>Hora (opcional)</label>
              <input
                type="time"
                value={horaChecklist}
                onChange={(e) => setHoraChecklist(e.target.value)}
                disabled={!dataChecklist}
                style={{ width: '100%' }}
              />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label>Ítems (un per línia)</label>
            <textarea
              value={itemsText}
              onChange={(e) => setItemsText(e.target.value)}
              rows={4}
              placeholder={'Comprovar temperatura\nRevisar stock\nTancar portes'}
              style={{ width: '100%' }}
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
          const assignatText = c.assignatAlReten
            ? `Retén${c.retenResolt ? ` (${c.retenResolt.nom})` : ' (sense assignar)'}`
            : c.assignatAQuinzena
            ? `Quinzena A${c.quinzenaResolt ? ` (${c.quinzenaResolt.nom})` : ' (sense assignar)'}`
            : c.assignatAQuinzenaB
            ? `Quinzena B${c.quinzenaBResolt ? ` (${c.quinzenaBResolt.nom})` : ' (sense assignar)'}`
            : c.assignatA?.nom || '—';
          return (
            <div key={c.id} className="card" style={{ maxWidth: 480 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <strong>{c.nom}</strong>
                <span className="text-muted" style={{ fontSize: 12 }}>{etiquetaFreq[c.frequencia]}</span>
              </div>
              <p className="text-muted" style={{ fontSize: 13, margin: '4px 0 10px' }}>
                Assignat a {assignatText} · {new Date(c.data).toLocaleDateString('ca-ES', { weekday: 'long', day: 'numeric', month: 'short' })}{sufixHora(c.data)} · {fetes}/{c.items.length} fets
              </p>

              {esEncarregat && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <button onClick={() => (editantId === c.id ? setEditantId(null) : obrirEdicio(c))}>
                    {editantId === c.id ? 'Cancel·lar' : 'Editar'}
                  </button>
                  <button onClick={() => handleEliminar(c.id)} style={{ color: 'var(--c-error)' }}>
                    Eliminar
                  </button>
                </div>
              )}

              {editantId === c.id && (
                <form onSubmit={handleGuardarEdicio} style={{ borderTop: '1px solid var(--c-border)', paddingTop: 10, marginBottom: 10 }}>
                  <div style={{ marginBottom: 8 }}>
                    <label>Nom</label>
                    <input value={editNom} onChange={(e) => setEditNom(e.target.value)} required style={{ width: '100%' }} />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label>Assignar a</label>
                    <select
                      value={editAssignatAId}
                      onChange={(e) => setEditAssignatAId(e.target.value)}
                      disabled={editAssignatAlReten || editAssignatAQuinzena || editAssignatAQuinzenaB}
                      style={{ width: '100%' }}
                    >
                      <option value="">Selecciona un usuari</option>
                      {treballadors.map((t) => (
                        <option key={t.id} value={t.id}>{t.nom}</option>
                      ))}
                    </select>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontWeight: 400 }}>
                      <input
                        type="checkbox"
                        checked={editAssignatAlReten}
                        onChange={(e) => {
                          setEditAssignatAlReten(e.target.checked);
                          if (e.target.checked) { setEditAssignatAQuinzena(false); setEditAssignatAQuinzenaB(false); }
                        }}
                      />
                      📞 Assignar al retén
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontWeight: 400 }}>
                      <input
                        type="checkbox"
                        checked={editAssignatAQuinzena}
                        onChange={(e) => {
                          setEditAssignatAQuinzena(e.target.checked);
                          if (e.target.checked) { setEditAssignatAlReten(false); setEditAssignatAQuinzenaB(false); }
                        }}
                      />
                      🔁 Assignar a la quinzena A
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontWeight: 400 }}>
                      <input
                        type="checkbox"
                        checked={editAssignatAQuinzenaB}
                        onChange={(e) => {
                          setEditAssignatAQuinzenaB(e.target.checked);
                          if (e.target.checked) { setEditAssignatAlReten(false); setEditAssignatAQuinzena(false); }
                        }}
                      />
                      🔂 Assignar a la quinzena B
                    </label>
                  </div>
                  <div style={{ marginBottom: 8, display: 'flex', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <label>Dia</label>
                      <input type="date" value={editData} onChange={(e) => setEditData(e.target.value)} required style={{ width: '100%' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label>Hora (opcional)</label>
                      <input type="time" value={editHora} onChange={(e) => setEditHora(e.target.value)} style={{ width: '100%' }} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label>Freqüència / repetició</label>
                    <select value={editFrequencia} onChange={(e) => setEditFrequencia(e.target.value as any)} style={{ width: '100%' }}>
                      <option value="PUNTUAL">Puntual (no es repeteix)</option>
                      <option value="DIARIA">Diària</option>
                      <option value="SETMANAL">Setmanal (mateix dia cada setmana)</option>
                    </select>
                  </div>
                  <button type="submit">Desar canvis</button>
                </form>
              )}

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
