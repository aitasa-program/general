import { useEffect, useState } from 'react';
import { getUsuariActual } from '../services/api';
import {
  Fitxatge,
  editarFitxatge,
  eliminarFitxatge,
  fitxarEntrada,
  fitxarSortida,
  llistarFitxatges,
  obtenirFitxatgeActual,
} from '../services/fitxatge';
import BotoTornar from '../components/BotoTornar';

function aDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDataHora(iso: string): string {
  return new Date(iso).toLocaleString('ca-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function formatDuracio(entrada: string, sortida: string | null): string {
  const fi = sortida ? new Date(sortida) : new Date();
  const ms = fi.getTime() - new Date(entrada).getTime();
  const hores = Math.floor(ms / 3600000);
  const minuts = Math.floor((ms % 3600000) / 60000);
  return `${hores}h ${minuts}min`;
}

export default function FitxatgePage() {
  const usuariActual = getUsuariActual();
  const esEncarregat = usuariActual?.rol === 'ENCARREGAT';

  const [obert, setObert] = useState<Fitxatge | null>(null);
  const [fitxatges, setFitxatges] = useState<Fitxatge[]>([]);
  const [carregant, setCarregant] = useState(true);
  const [error, setError] = useState('');
  const [processant, setProcessant] = useState(false);

  const [editantId, setEditantId] = useState<string | null>(null);
  const [editEntrada, setEditEntrada] = useState('');
  const [editSortida, setEditSortida] = useState('');

  async function carregar() {
    setCarregant(true);
    try {
      const [dadesObert, dadesFitxatges] = await Promise.all([obtenirFitxatgeActual(), llistarFitxatges()]);
      setObert(dadesObert);
      setFitxatges(dadesFitxatges);
    } catch {
      setError('No s\'han pogut carregar els fitxatges');
    } finally {
      setCarregant(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function handleFitxar() {
    setError('');
    setProcessant(true);
    try {
      if (obert) {
        await fitxarSortida();
      } else {
        await fitxarEntrada();
      }
      carregar();
    } catch {
      setError('No s\'ha pogut fitxar');
    } finally {
      setProcessant(false);
    }
  }

  function obrirEdicio(f: Fitxatge) {
    setEditantId(editantId === f.id ? null : f.id);
    setEditEntrada(aDatetimeLocal(f.entrada));
    setEditSortida(f.sortida ? aDatetimeLocal(f.sortida) : '');
  }

  async function handleGuardarEdicio(e: React.FormEvent) {
    e.preventDefault();
    if (!editantId) return;
    setError('');
    try {
      await editarFitxatge(editantId, {
        entrada: new Date(editEntrada).toISOString(),
        sortida: editSortida ? new Date(editSortida).toISOString() : null,
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

  return (
    <div className="page">
      <BotoTornar />
      <h1>Fitxatge</h1>

      {error && <p className="text-error">{error}</p>}

      <div className="card" style={{ marginTop: 12, maxWidth: 420, display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 28 }}>{obert ? '🟢' : '⚪'}</span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 700 }}>
            {obert ? `Fitxat des de les ${formatDataHora(obert.entrada)}` : 'No estàs fitxat'}
          </p>
          {obert && (
            <p className="text-muted" style={{ margin: '2px 0 0', fontSize: 12 }}>
              Portes {formatDuracio(obert.entrada, null)}
            </p>
          )}
        </div>
        <button onClick={handleFitxar} disabled={processant}>
          {obert ? 'Fitxar sortida' : 'Fitxar entrada'}
        </button>
      </div>

      <h2 style={{ fontSize: 18, marginTop: 24 }}>El meu historial</h2>
      {mevesFitxatges.length === 0 ? (
        <p className="text-muted">Encara no tens cap fitxatge registrat.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {mevesFitxatges.map((f) => (
            <div key={f.id} className="card" style={{ maxWidth: 480, padding: 10, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>
                  {formatDataHora(f.entrada)} → {f.sortida ? formatDataHora(f.sortida) : 'en curs'}
                </span>
                <span className="text-muted">{formatDuracio(f.entrada, f.sortida)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {esEncarregat && (
        <>
          <h2 style={{ fontSize: 18, marginTop: 28 }}>Fitxatges de l'equip</h2>
          {equipFitxatges.length === 0 ? (
            <p className="text-muted">Encara no hi ha cap fitxatge registrat.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {equipFitxatges.map((f) => (
                <div key={f.id} className="card" style={{ maxWidth: 560 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <strong>{f.usuari.nom}</strong>
                    <span className="text-muted">{formatDuracio(f.entrada, f.sortida)}</span>
                  </div>
                  <p style={{ fontSize: 13, margin: '4px 0 8px' }}>
                    {formatDataHora(f.entrada)} → {f.sortida ? formatDataHora(f.sortida) : <strong>en curs</strong>}
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
                      <div style={{ marginBottom: 8, display: 'flex', gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <label>Entrada</label>
                          <input type="datetime-local" value={editEntrada} onChange={(e) => setEditEntrada(e.target.value)} required style={{ width: '100%' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label>Sortida (buit si encara no ha sortit)</label>
                          <input type="datetime-local" value={editSortida} onChange={(e) => setEditSortida(e.target.value)} style={{ width: '100%' }} />
                        </div>
                      </div>
                      <button type="submit">Desar canvis</button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
