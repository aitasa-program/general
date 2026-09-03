import { useEffect, useState } from 'react';
import { getUsuariActual } from '../services/api';
import {
  RegistreReten,
  TipusRegistreReten,
  crearRegistreReten,
  editarRegistreReten,
  eliminarRegistreReten,
  llistarRegistresReten,
} from '../services/registreReten';
import BotoTornar from '../components/BotoTornar';

const ETIQUETES: Record<TipusRegistreReten, string> = {
  EXTRA_NORMAL: 'Hora extra normal',
  EXTRA_NOCTURNA: 'Hora extra nocturna',
  EXTRA_FESTIU: 'Hora extra dia festiu',
  TRUCADA: 'Trucada',
};

function etiquetaQuantitat(tipus: TipusRegistreReten): string {
  return tipus === 'TRUCADA' ? 'Durada (minuts, opcional)' : 'Hores';
}

function formatQuantitat(r: RegistreReten): string {
  if (r.quantitat === null) return '';
  return r.tipus === 'TRUCADA' ? `${r.quantitat} min` : `${r.quantitat} h`;
}

const buit = {
  tipus: 'EXTRA_NORMAL' as TipusRegistreReten,
  data: new Date().toISOString().slice(0, 10),
  quantitat: '',
  notes: '',
};

export default function RegistreRetenPage() {
  const usuariActual = getUsuariActual();
  const esEncarregat = usuariActual?.rol === 'ENCARREGAT';

  const [registres, setRegistres] = useState<RegistreReten[]>([]);
  const [carregant, setCarregant] = useState(true);
  const [error, setError] = useState('');
  const [mostrarFormulari, setMostrarFormulari] = useState(false);
  const [form, setForm] = useState(buit);

  const [editantId, setEditantId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(buit);

  async function carregar() {
    setCarregant(true);
    try {
      const dades = await llistarRegistresReten();
      setRegistres(dades);
    } catch {
      setError('No s\'han pogut carregar els registres');
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
      await crearRegistreReten({
        tipus: form.tipus,
        data: form.data,
        quantitat: form.quantitat === '' ? '' : Number(form.quantitat),
        notes: form.notes || undefined,
      });
      setForm({ ...buit, data: form.data });
      setMostrarFormulari(false);
      carregar();
    } catch {
      setError("No s'ha pogut desar el registre");
    }
  }

  function obrirEdicio(r: RegistreReten) {
    setEditantId(editantId === r.id ? null : r.id);
    setEditForm({
      tipus: r.tipus,
      data: r.data.slice(0, 10),
      quantitat: r.quantitat === null ? '' : String(r.quantitat),
      notes: r.notes || '',
    });
  }

  async function handleGuardarEdicio(e: React.FormEvent) {
    e.preventDefault();
    if (!editantId) return;
    setError('');
    try {
      await editarRegistreReten(editantId, {
        tipus: editForm.tipus,
        data: editForm.data,
        quantitat: editForm.quantitat === '' ? '' : Number(editForm.quantitat),
        notes: editForm.notes,
      });
      setEditantId(null);
      carregar();
    } catch {
      setError("No s'han pogut desar els canvis");
    }
  }

  async function handleEliminar(id: string) {
    setError('');
    try {
      await eliminarRegistreReten(id);
      carregar();
    } catch {
      setError('No s\'ha pogut eliminar el registre');
    }
  }

  if (carregant) return <p className="page text-muted">Carregant registres...</p>;

  const mevesRegistres = registres.filter((r) => r.usuariId === usuariActual?.id);
  const totesEls = esEncarregat ? registres : [];

  function targetaRegistre(r: RegistreReten, mostrarUsuari: boolean) {
    return (
      <div key={r.id} className="card" style={{ maxWidth: 480 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <strong>{ETIQUETES[r.tipus]}</strong>
          <span className="text-muted" style={{ fontSize: 12 }}>{new Date(r.data).toLocaleDateString('ca-ES')}</span>
        </div>
        <p className="text-muted" style={{ fontSize: 13, margin: '4px 0 8px' }}>
          {mostrarUsuari && `${r.usuari.nom} · `}
          {formatQuantitat(r) || 'Sense quantitat'}
          {r.notes && ` · ${r.notes}`}
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => obrirEdicio(r)} style={{ fontSize: 12 }}>
            {editantId === r.id ? 'Cancel·lar' : 'Editar'}
          </button>
          <button onClick={() => handleEliminar(r.id)} style={{ fontSize: 12, color: 'var(--c-error)' }}>
            Eliminar
          </button>
        </div>

        {editantId === r.id && (
          <form onSubmit={handleGuardarEdicio} style={{ borderTop: '1px solid var(--c-border)', marginTop: 10, paddingTop: 10 }}>
            <div style={{ marginBottom: 8 }}>
              <label>Tipus</label>
              <select value={editForm.tipus} onChange={(e) => setEditForm({ ...editForm, tipus: e.target.value as TipusRegistreReten })} style={{ width: '100%' }}>
                {Object.entries(ETIQUETES).map(([valor, text]) => (
                  <option key={valor} value={valor}>{text}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 8, display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label>Data</label>
                <input type="date" value={editForm.data} onChange={(e) => setEditForm({ ...editForm, data: e.target.value })} required style={{ width: '100%' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label>{etiquetaQuantitat(editForm.tipus)}</label>
                <input type="number" step="0.5" value={editForm.quantitat} onChange={(e) => setEditForm({ ...editForm, quantitat: e.target.value })} style={{ width: '100%' }} />
              </div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label>Notes (opcional)</label>
              <input value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} style={{ width: '100%' }} />
            </div>
            <button type="submit">Desar canvis</button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="page">
      <BotoTornar />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Hores de retén</h1>
        <button onClick={() => setMostrarFormulari(!mostrarFormulari)}>
          {mostrarFormulari ? 'Cancel·lar' : '+ Nou registre'}
        </button>
      </div>

      <p className="text-muted" style={{ fontSize: 13 }}>
        Apunta aquí les hores extres i trucades de quan estàs de retén, per portar el compte de cara a nòmina.
      </p>

      {error && <p className="text-error">{error}</p>}

      {mostrarFormulari && (
        <form onSubmit={handleCrear} className="card" style={{ marginBottom: 20, maxWidth: 420 }}>
          <div style={{ marginBottom: 10 }}>
            <label>Tipus</label>
            <select value={form.tipus} onChange={(e) => setForm({ ...form, tipus: e.target.value as TipusRegistreReten })} style={{ width: '100%' }}>
              {Object.entries(ETIQUETES).map(([valor, text]) => (
                <option key={valor} value={valor}>{text}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 10, display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label>Data</label>
              <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} required style={{ width: '100%' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label>{etiquetaQuantitat(form.tipus)}</label>
              <input type="number" step="0.5" value={form.quantitat} onChange={(e) => setForm({ ...form, quantitat: e.target.value })} style={{ width: '100%' }} />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label>Notes (opcional)</label>
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Ex: motiu de la trucada" style={{ width: '100%' }} />
          </div>
          <button type="submit">Desar registre</button>
        </form>
      )}

      <h2 style={{ fontSize: 18 }}>Les meves entrades</h2>
      {mevesRegistres.length === 0 ? (
        <p className="text-muted">Encara no has apuntat cap hora de retén.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mevesRegistres.map((r) => targetaRegistre(r, false))}
        </div>
      )}

      {esEncarregat && (
        <>
          <h2 style={{ fontSize: 18, marginTop: 28 }}>Totes les entrades</h2>
          {totesEls.length === 0 ? (
            <p className="text-muted">Encara no hi ha cap registre.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {totesEls.map((r) => targetaRegistre(r, true))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
