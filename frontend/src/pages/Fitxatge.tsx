import { useEffect, useState } from 'react';
import { getUsuariActual } from '../services/api';
import {
  Fitxatge,
  crearFitxatge,
  editarFitxatge,
  eliminarFitxatge,
  llistarFitxatges,
} from '../services/fitxatge';
import { ZonaComptador, llistarZones } from '../services/comptadors';
import BotoTornar from '../components/BotoTornar';

const ALTRES = '__altres__';

function combinar(data: string, hora: string): string {
  return new Date(`${data}T${hora}:00`).toISOString();
}

function aDataInput(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function aHoraInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatData(iso: string): string {
  return new Date(iso).toLocaleDateString('ca-ES', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatDuracio(entrada: string, sortida: string): string {
  const ms = new Date(sortida).getTime() - new Date(entrada).getTime();
  const hores = Math.floor(ms / 3600000);
  const minuts = Math.round((ms % 3600000) / 60000);
  return `${hores}h ${minuts}min`;
}

const buit = {
  data: new Date().toISOString().slice(0, 10),
  horaEntrada: '',
  horaSortida: '',
  lloc: '',
  llocAltres: '',
  descripcio: '',
};

export default function FitxatgePage() {
  const usuariActual = getUsuariActual();
  const esEncarregat = usuariActual?.rol === 'ENCARREGAT';

  const [fitxatges, setFitxatges] = useState<Fitxatge[]>([]);
  const [zones, setZones] = useState<ZonaComptador[]>([]);
  const [carregant, setCarregant] = useState(true);
  const [error, setError] = useState('');
  const [mostrarFormulari, setMostrarFormulari] = useState(false);
  const [form, setForm] = useState(buit);

  const [editantId, setEditantId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(buit);

  async function carregar() {
    setCarregant(true);
    try {
      const [dadesFitxatges, dadesZones] = await Promise.all([llistarFitxatges(), llistarZones()]);
      setFitxatges(dadesFitxatges);
      setZones(dadesZones);
    } catch {
      setError("No s'han pogut carregar els fitxatges");
    } finally {
      setCarregant(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function llocFinal(lloc: string, llocAltres: string): string {
    return lloc === ALTRES ? llocAltres.trim() : lloc;
  }

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const lloc = llocFinal(form.lloc, form.llocAltres);
    if (!lloc) {
      setError('Indica el lloc de treball');
      return;
    }
    try {
      await crearFitxatge({
        entrada: combinar(form.data, form.horaEntrada),
        sortida: combinar(form.data, form.horaSortida),
        lloc,
        descripcio: form.descripcio || undefined,
      });
      setForm({ ...buit, data: form.data });
      setMostrarFormulari(false);
      carregar();
    } catch {
      setError("No s'ha pogut desar el fitxatge (revisa que la sortida sigui després de l'entrada)");
    }
  }

  function obrirEdicio(f: Fitxatge) {
    setEditantId(editantId === f.id ? null : f.id);
    const zonaCoincideix = zones.some((z) => z.nom === f.lloc);
    setEditForm({
      data: aDataInput(f.entrada),
      horaEntrada: aHoraInput(f.entrada),
      horaSortida: aHoraInput(f.sortida),
      lloc: zonaCoincideix ? f.lloc : ALTRES,
      llocAltres: zonaCoincideix ? '' : f.lloc,
      descripcio: f.descripcio || '',
    });
  }

  async function handleGuardarEdicio(e: React.FormEvent) {
    e.preventDefault();
    if (!editantId) return;
    setError('');
    const lloc = llocFinal(editForm.lloc, editForm.llocAltres);
    if (!lloc) {
      setError('Indica el lloc de treball');
      return;
    }
    try {
      await editarFitxatge(editantId, {
        entrada: combinar(editForm.data, editForm.horaEntrada),
        sortida: combinar(editForm.data, editForm.horaSortida),
        lloc,
        descripcio: editForm.descripcio,
      });
      setEditantId(null);
      carregar();
    } catch {
      setError('No s\'han pogut desar els canvis');
    }
  }

  async function handleEliminar(id: string) {
    setError('');
    try {
      await eliminarFitxatge(id);
      carregar();
    } catch {
      setError('No s\'ha pogut eliminar el fitxatge');
    }
  }

  if (carregant) return <p className="page text-muted">Carregant fitxatge...</p>;

  const mevesFitxatges = fitxatges.filter((f) => f.usuariId === usuariActual?.id);
  const equipFitxatges = esEncarregat ? fitxatges : [];

  function camposLloc(valor: string, valorAltres: string, onLloc: (v: string) => void, onAltres: (v: string) => void) {
    return (
      <>
        <select value={valor} onChange={(e) => onLloc(e.target.value)} required style={{ width: '100%' }}>
          <option value="">Selecciona...</option>
          {zones.map((z) => (
            <option key={z.id} value={z.nom}>{z.nom}</option>
          ))}
          <option value={ALTRES}>Altres...</option>
        </select>
        {valor === ALTRES && (
          <input
            value={valorAltres}
            onChange={(e) => onAltres(e.target.value)}
            placeholder="Indica el lloc"
            required
            style={{ width: '100%', marginTop: 6 }}
          />
        )}
      </>
    );
  }

  function targetaFitxatge(f: Fitxatge, mostrarUsuari: boolean) {
    return (
      <div key={f.id} className="card" style={{ maxWidth: 480 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <strong>{formatData(f.entrada)}</strong>
          <span className="text-muted" style={{ fontSize: 12 }}>{formatDuracio(f.entrada, f.sortida)}</span>
        </div>
        <p className="text-muted" style={{ fontSize: 13, margin: '4px 0 8px' }}>
          {mostrarUsuari && `${f.usuari.nom} · `}
          {aHoraInput(f.entrada)} – {aHoraInput(f.sortida)} · {f.lloc}
          {f.descripcio && ` · ${f.descripcio}`}
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => obrirEdicio(f)} style={{ fontSize: 12 }}>
            {editantId === f.id ? 'Cancel·lar' : 'Editar'}
          </button>
          <button onClick={() => handleEliminar(f.id)} style={{ fontSize: 12, color: 'var(--c-error)' }}>
            Eliminar
          </button>
        </div>

        {editantId === f.id && (
          <form onSubmit={handleGuardarEdicio} style={{ borderTop: '1px solid var(--c-border)', marginTop: 10, paddingTop: 10 }}>
            <div style={{ marginBottom: 8 }}>
              <label>Dia</label>
              <input type="date" value={editForm.data} onChange={(e) => setEditForm({ ...editForm, data: e.target.value })} required style={{ width: '100%' }} />
            </div>
            <div style={{ marginBottom: 8, display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label>Entrada</label>
                <input type="time" value={editForm.horaEntrada} onChange={(e) => setEditForm({ ...editForm, horaEntrada: e.target.value })} required style={{ width: '100%' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label>Sortida</label>
                <input type="time" value={editForm.horaSortida} onChange={(e) => setEditForm({ ...editForm, horaSortida: e.target.value })} required style={{ width: '100%' }} />
              </div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label>Lloc de treball</label>
              {camposLloc(
                editForm.lloc,
                editForm.llocAltres,
                (v) => setEditForm({ ...editForm, lloc: v }),
                (v) => setEditForm({ ...editForm, llocAltres: v })
              )}
            </div>
            <div style={{ marginBottom: 8 }}>
              <label>Què has fet (opcional)</label>
              <input value={editForm.descripcio} onChange={(e) => setEditForm({ ...editForm, descripcio: e.target.value })} style={{ width: '100%' }} />
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
        <h1>Fitxatge</h1>
        <button onClick={() => setMostrarFormulari(!mostrarFormulari)}>
          {mostrarFormulari ? 'Cancel·lar' : '+ Apuntar jornada'}
        </button>
      </div>

      {error && <p className="text-error">{error}</p>}

      {mostrarFormulari && (
        <form onSubmit={handleCrear} className="card" style={{ marginBottom: 20, maxWidth: 420 }}>
          <div style={{ marginBottom: 10 }}>
            <label>Dia</label>
            <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} required style={{ width: '100%' }} />
          </div>
          <div style={{ marginBottom: 10, display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label>Hora d'entrada</label>
              <input type="time" value={form.horaEntrada} onChange={(e) => setForm({ ...form, horaEntrada: e.target.value })} required style={{ width: '100%' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label>Hora de sortida</label>
              <input type="time" value={form.horaSortida} onChange={(e) => setForm({ ...form, horaSortida: e.target.value })} required style={{ width: '100%' }} />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label>Lloc de treball</label>
            {camposLloc(
              form.lloc,
              form.llocAltres,
              (v) => setForm({ ...form, lloc: v }),
              (v) => setForm({ ...form, llocAltres: v })
            )}
          </div>
          <div style={{ marginBottom: 10 }}>
            <label>Què has fet (opcional)</label>
            <input value={form.descripcio} onChange={(e) => setForm({ ...form, descripcio: e.target.value })} style={{ width: '100%' }} />
          </div>
          <button type="submit">Desar fitxatge</button>
        </form>
      )}

      <h2 style={{ fontSize: 18 }}>El meu historial</h2>
      {mevesFitxatges.length === 0 ? (
        <p className="text-muted">Encara no tens cap fitxatge registrat.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {mevesFitxatges.map((f) => targetaFitxatge(f, false))}
        </div>
      )}

      {esEncarregat && (
        <>
          <h2 style={{ fontSize: 18, marginTop: 28 }}>Fitxatges de l'equip</h2>
          {equipFitxatges.length === 0 ? (
            <p className="text-muted">Encara no hi ha cap fitxatge registrat.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {equipFitxatges.map((f) => targetaFitxatge(f, true))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
