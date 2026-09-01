import { useEffect, useState } from 'react';
import {
  Vehicle,
  crearVehicle,
  editarVehicle,
  eliminarVehicle,
  llistarVehicles,
} from '../services/vehicles';
import BotoTornar from '../components/BotoTornar';

function aDataInput(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toISOString().slice(0, 10);
}

function estatData(iso: string | null): { text: string; color: string } {
  if (!iso) return { text: 'Sense programar', color: 'var(--c-muted)' };
  const data = new Date(iso);
  const avui = new Date();
  avui.setHours(0, 0, 0, 0);
  const dies = Math.floor((data.getTime() - avui.getTime()) / (1000 * 60 * 60 * 24));
  const dataText = data.toLocaleDateString('ca-ES');
  if (dies < 0) return { text: `${dataText} (vençuda)`, color: 'var(--c-error)' };
  if (dies <= 30) return { text: `${dataText} (properament)`, color: '#b8860b' };
  return { text: dataText, color: 'inherit' };
}

function propera(v: Vehicle): number {
  const dates = [v.proximaItv, v.proximaRevisio].filter(Boolean).map((d) => new Date(d as string).getTime());
  return dates.length > 0 ? Math.min(...dates) : Infinity;
}

const buit = {
  matricula: '',
  marca: '',
  model: '',
  propietat: 'PROPI' as 'PROPI' | 'RENTING',
  empresaRenting: '',
  proximaItv: '',
  proximaRevisio: '',
  notes: '',
};

export default function Vehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [carregant, setCarregant] = useState(true);
  const [error, setError] = useState('');
  const [mostrarFormulari, setMostrarFormulari] = useState(false);
  const [form, setForm] = useState(buit);

  const [editantId, setEditantId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(buit);

  async function carregar() {
    setCarregant(true);
    try {
      const dades = await llistarVehicles();
      setVehicles([...dades].sort((a, b) => propera(a) - propera(b)));
    } catch {
      setError('No s\'han pogut carregar els vehicles');
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
      await crearVehicle({
        matricula: form.matricula,
        marca: form.marca || undefined,
        model: form.model || undefined,
        propietat: form.propietat,
        empresaRenting: form.propietat === 'RENTING' ? form.empresaRenting || undefined : undefined,
        proximaItv: form.proximaItv || undefined,
        proximaRevisio: form.proximaRevisio || undefined,
        notes: form.notes || undefined,
      });
      setForm(buit);
      setMostrarFormulari(false);
      carregar();
    } catch {
      setError('No s\'ha pogut crear el vehicle (revisa que la matrícula no estigui repetida)');
    }
  }

  function obrirEdicio(v: Vehicle) {
    setEditantId(editantId === v.id ? null : v.id);
    setEditForm({
      matricula: v.matricula,
      marca: v.marca || '',
      model: v.model || '',
      propietat: v.propietat,
      empresaRenting: v.empresaRenting || '',
      proximaItv: aDataInput(v.proximaItv),
      proximaRevisio: aDataInput(v.proximaRevisio),
      notes: v.notes || '',
    });
  }

  async function handleGuardarEdicio(e: React.FormEvent) {
    e.preventDefault();
    if (!editantId) return;
    setError('');
    try {
      await editarVehicle(editantId, {
        matricula: editForm.matricula,
        marca: editForm.marca || undefined,
        model: editForm.model || undefined,
        propietat: editForm.propietat,
        empresaRenting: editForm.propietat === 'RENTING' ? editForm.empresaRenting || undefined : undefined,
        proximaItv: editForm.proximaItv || undefined,
        proximaRevisio: editForm.proximaRevisio || undefined,
        notes: editForm.notes || undefined,
      });
      setEditantId(null);
      carregar();
    } catch {
      setError('No s\'han pogut desar els canvis del vehicle');
    }
  }

  async function handleEliminar(id: string) {
    try {
      await eliminarVehicle(id);
      carregar();
    } catch {
      setError('No s\'ha pogut eliminar el vehicle');
    }
  }

  if (carregant) return <p className="page text-muted">Carregant vehicles...</p>;

  return (
    <div className="page">
      <BotoTornar />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>ITV i revisions</h1>
        <button onClick={() => setMostrarFormulari(!mostrarFormulari)}>
          {mostrarFormulari ? 'Cancel·lar' : '+ Nou vehicle'}
        </button>
      </div>

      <p className="text-muted" style={{ fontSize: 13 }}>
        Control de les dates d'ITV i revisió de tots els cotxes de l'empresa, propis i de renting.
        Si cal que algú porti un cotxe a passar-la, crea una tasca normal des de "Tasques" o "Dia a dia".
      </p>

      {error && <p className="text-error">{error}</p>}

      {mostrarFormulari && (
        <form onSubmit={handleCrear} className="card" style={{ marginBottom: 20, maxWidth: 460 }}>
          <div style={{ marginBottom: 10, display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label>Matrícula</label>
              <input value={form.matricula} onChange={(e) => setForm({ ...form, matricula: e.target.value })} required style={{ width: '100%' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label>Propietat</label>
              <select value={form.propietat} onChange={(e) => setForm({ ...form, propietat: e.target.value as any })} style={{ width: '100%' }}>
                <option value="PROPI">Propi</option>
                <option value="RENTING">Renting</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 10, display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label>Marca (opcional)</label>
              <input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} style={{ width: '100%' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label>Model (opcional)</label>
              <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} style={{ width: '100%' }} />
            </div>
          </div>
          {form.propietat === 'RENTING' && (
            <div style={{ marginBottom: 10 }}>
              <label>Empresa de renting</label>
              <input value={form.empresaRenting} onChange={(e) => setForm({ ...form, empresaRenting: e.target.value })} style={{ width: '100%' }} />
            </div>
          )}
          <div style={{ marginBottom: 10, display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label>Propera ITV (opcional)</label>
              <input type="date" value={form.proximaItv} onChange={(e) => setForm({ ...form, proximaItv: e.target.value })} style={{ width: '100%' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label>Propera revisió (opcional)</label>
              <input type="date" value={form.proximaRevisio} onChange={(e) => setForm({ ...form, proximaRevisio: e.target.value })} style={{ width: '100%' }} />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label>Notes (opcional)</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} style={{ width: '100%' }} />
          </div>
          <button type="submit">Crear vehicle</button>
        </form>
      )}

      {vehicles.length === 0 ? (
        <p className="text-muted">Encara no hi ha cap vehicle registrat.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {vehicles.map((v) => {
            const itv = estatData(v.proximaItv);
            const revisio = estatData(v.proximaRevisio);
            return (
              <div key={v.id} className="card" style={{ maxWidth: 480 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <strong>{v.matricula}</strong>
                  <span className="badge badge--role">{v.propietat === 'PROPI' ? 'Propi' : 'Renting'}</span>
                </div>
                {(v.marca || v.model) && (
                  <p className="text-muted" style={{ fontSize: 13, margin: '4px 0' }}>
                    {[v.marca, v.model].filter(Boolean).join(' ')}
                    {v.propietat === 'RENTING' && v.empresaRenting ? ` · ${v.empresaRenting}` : ''}
                  </p>
                )}
                <p style={{ fontSize: 13, margin: '6px 0 0' }}>
                  ITV: <span style={{ color: itv.color, fontWeight: 600 }}>{itv.text}</span>
                </p>
                <p style={{ fontSize: 13, margin: '2px 0 8px' }}>
                  Revisió: <span style={{ color: revisio.color, fontWeight: 600 }}>{revisio.text}</span>
                </p>
                {v.notes && <p className="text-muted" style={{ fontSize: 12, margin: '0 0 8px' }}>{v.notes}</p>}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => obrirEdicio(v)} style={{ fontSize: 12 }}>
                    {editantId === v.id ? 'Cancel·lar' : 'Editar'}
                  </button>
                  <button onClick={() => handleEliminar(v.id)} style={{ fontSize: 12, color: 'var(--c-error)' }}>
                    Eliminar
                  </button>
                </div>

                {editantId === v.id && (
                  <form onSubmit={handleGuardarEdicio} style={{ borderTop: '1px solid var(--c-border)', marginTop: 10, paddingTop: 10 }}>
                    <div style={{ marginBottom: 8, display: 'flex', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <label>Matrícula</label>
                        <input value={editForm.matricula} onChange={(e) => setEditForm({ ...editForm, matricula: e.target.value })} required style={{ width: '100%' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label>Propietat</label>
                        <select value={editForm.propietat} onChange={(e) => setEditForm({ ...editForm, propietat: e.target.value as any })} style={{ width: '100%' }}>
                          <option value="PROPI">Propi</option>
                          <option value="RENTING">Renting</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ marginBottom: 8, display: 'flex', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <label>Marca</label>
                        <input value={editForm.marca} onChange={(e) => setEditForm({ ...editForm, marca: e.target.value })} style={{ width: '100%' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label>Model</label>
                        <input value={editForm.model} onChange={(e) => setEditForm({ ...editForm, model: e.target.value })} style={{ width: '100%' }} />
                      </div>
                    </div>
                    {editForm.propietat === 'RENTING' && (
                      <div style={{ marginBottom: 8 }}>
                        <label>Empresa de renting</label>
                        <input value={editForm.empresaRenting} onChange={(e) => setEditForm({ ...editForm, empresaRenting: e.target.value })} style={{ width: '100%' }} />
                      </div>
                    )}
                    <div style={{ marginBottom: 8, display: 'flex', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <label>Propera ITV</label>
                        <input type="date" value={editForm.proximaItv} onChange={(e) => setEditForm({ ...editForm, proximaItv: e.target.value })} style={{ width: '100%' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label>Propera revisió</label>
                        <input type="date" value={editForm.proximaRevisio} onChange={(e) => setEditForm({ ...editForm, proximaRevisio: e.target.value })} style={{ width: '100%' }} />
                      </div>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <label>Notes</label>
                      <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={2} style={{ width: '100%' }} />
                    </div>
                    <button type="submit">Desar canvis</button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
