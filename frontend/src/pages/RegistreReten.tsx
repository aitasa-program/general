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

interface Linia {
  tipus: TipusRegistreReten;
  horaInici: string;
  horaFi: string;
  notes: string;
}

const liniaBuida: Linia = { tipus: 'EXTRA_NORMAL', horaInici: '', horaFi: '', notes: '' };

export default function RegistreRetenPage() {
  const usuariActual = getUsuariActual();
  const esEncarregat = usuariActual?.rol === 'ENCARREGAT';

  const [registres, setRegistres] = useState<RegistreReten[]>([]);
  const [carregant, setCarregant] = useState(true);
  const [error, setError] = useState('');
  const [mostrarFormulari, setMostrarFormulari] = useState(false);

  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [linia, setLinia] = useState<Linia>(liniaBuida);
  const [pendents, setPendents] = useState<Linia[]>([]);

  const [editantId, setEditantId] = useState<string | null>(null);
  const [editData, setEditData] = useState('');
  const [editLinia, setEditLinia] = useState<Linia>(liniaBuida);

  const [mesFiltre, setMesFiltre] = useState('');

  async function carregar() {
    setCarregant(true);
    try {
      const dades = await llistarRegistresReten();
      setRegistres(dades);
    } catch {
      setError("No s'han pogut carregar els registres");
    } finally {
      setCarregant(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function liniaValida(l: Linia): boolean {
    return !!l.horaInici && !!l.horaFi && l.horaFi > l.horaInici;
  }

  function handleAfegirLinia() {
    setError('');
    if (!liniaValida(linia)) {
      setError("Indica de quina hora a quina hora (la fi ha de ser posterior a l'inici)");
      return;
    }
    setPendents((prev) => [...prev, linia]);
    setLinia({ ...liniaBuida, tipus: linia.tipus });
  }

  function handleTreureLinia(index: number) {
    setPendents((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleDesarTots(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const totes = [...pendents];
    if (liniaValida(linia)) totes.push(linia);
    if (totes.length === 0) {
      setError('Afegeix almenys una línia amb hora d\'inici i de fi');
      return;
    }
    try {
      for (const l of totes) {
        await crearRegistreReten({
          tipus: l.tipus,
          data,
          horaInici: combinar(data, l.horaInici),
          horaFi: combinar(data, l.horaFi),
          notes: l.notes || undefined,
        });
      }
      setPendents([]);
      setLinia(liniaBuida);
      setMostrarFormulari(false);
      carregar();
    } catch {
      setError("No s'han pogut desar els registres");
    }
  }

  function obrirEdicio(r: RegistreReten) {
    setEditantId(editantId === r.id ? null : r.id);
    setEditData(aDataInput(r.data));
    setEditLinia({
      tipus: r.tipus,
      horaInici: aHoraInput(r.horaInici),
      horaFi: aHoraInput(r.horaFi),
      notes: r.notes || '',
    });
  }

  async function handleGuardarEdicio(e: React.FormEvent) {
    e.preventDefault();
    if (!editantId) return;
    setError('');
    if (!liniaValida(editLinia)) {
      setError("L'hora de fi ha de ser posterior a la d'inici");
      return;
    }
    try {
      await editarRegistreReten(editantId, {
        tipus: editLinia.tipus,
        data: editData,
        horaInici: combinar(editData, editLinia.horaInici),
        horaFi: combinar(editData, editLinia.horaFi),
        notes: editLinia.notes,
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

  async function handleExportarPdf(files: RegistreReten[]) {
    const { exportarPdf } = await import('../utils/pdfExport');
    exportarPdf(
      `Hores de retén${mesFiltre ? ` — ${mesFiltre}` : ''}`,
      ['Treballador', 'Tipus', 'Data', 'De', 'A', 'Hores', 'Notes'],
      files.map((r) => [
        r.usuari.nom,
        ETIQUETES[r.tipus],
        new Date(r.data).toLocaleDateString('ca-ES'),
        aHoraInput(r.horaInici),
        aHoraInput(r.horaFi),
        r.quantitat,
        r.notes || '',
      ]),
      `hores_reten${mesFiltre ? `_${mesFiltre}` : ''}.pdf`
    );
  }

  if (carregant) return <p className="page text-muted">Carregant registres...</p>;

  const mevesRegistres = registres.filter((r) => r.usuariId === usuariActual?.id);
  const totesEls = esEncarregat ? registres : [];
  const totesFiltrats = mesFiltre ? totesEls.filter((r) => r.data.slice(0, 7) === mesFiltre) : totesEls;

  function targetaRegistre(r: RegistreReten, mostrarUsuari: boolean) {
    return (
      <div key={r.id} className="card" style={{ maxWidth: 480 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <strong>{ETIQUETES[r.tipus]}</strong>
          <span className="text-muted" style={{ fontSize: 12 }}>{new Date(r.data).toLocaleDateString('ca-ES')}</span>
        </div>
        <p className="text-muted" style={{ fontSize: 13, margin: '4px 0 8px' }}>
          {mostrarUsuari && `${r.usuari.nom} · `}
          {aHoraInput(r.horaInici)} – {aHoraInput(r.horaFi)} ({r.quantitat}h)
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
              <select value={editLinia.tipus} onChange={(e) => setEditLinia({ ...editLinia, tipus: e.target.value as TipusRegistreReten })} style={{ width: '100%' }}>
                {Object.entries(ETIQUETES).map(([valor, text]) => (
                  <option key={valor} value={valor}>{text}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label>Data</label>
              <input type="date" value={editData} onChange={(e) => setEditData(e.target.value)} required style={{ width: '100%' }} />
            </div>
            <div style={{ marginBottom: 8, display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label>De quina hora</label>
                <input type="time" value={editLinia.horaInici} onChange={(e) => setEditLinia({ ...editLinia, horaInici: e.target.value })} required style={{ width: '100%' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label>A quina hora</label>
                <input type="time" value={editLinia.horaFi} onChange={(e) => setEditLinia({ ...editLinia, horaFi: e.target.value })} required style={{ width: '100%' }} />
              </div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label>Notes (opcional)</label>
              <input value={editLinia.notes} onChange={(e) => setEditLinia({ ...editLinia, notes: e.target.value })} style={{ width: '100%' }} />
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
        Pots afegir més d'una línia del mateix dia abans de desar.
      </p>

      {error && <p className="text-error">{error}</p>}

      {mostrarFormulari && (
        <form onSubmit={handleDesarTots} className="card" style={{ marginBottom: 20, maxWidth: 420 }}>
          <div style={{ marginBottom: 10 }}>
            <label>Dia</label>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} required style={{ width: '100%' }} />
          </div>

          {pendents.length > 0 && (
            <div style={{ marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {pendents.map((l, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, background: 'var(--c-bg-alt, #f2f4f8)', borderRadius: 6, padding: '6px 10px' }}>
                  <span>{ETIQUETES[l.tipus]} · {l.horaInici}–{l.horaFi}{l.notes ? ` · ${l.notes}` : ''}</span>
                  <button type="button" onClick={() => handleTreureLinia(i)} style={{ color: 'var(--c-error)', fontSize: 12 }}>✕</button>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginBottom: 10 }}>
            <label>Tipus</label>
            <select value={linia.tipus} onChange={(e) => setLinia({ ...linia, tipus: e.target.value as TipusRegistreReten })} style={{ width: '100%' }}>
              {Object.entries(ETIQUETES).map(([valor, text]) => (
                <option key={valor} value={valor}>{text}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 10, display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label>De quina hora</label>
              <input type="time" value={linia.horaInici} onChange={(e) => setLinia({ ...linia, horaInici: e.target.value })} style={{ width: '100%' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label>A quina hora</label>
              <input type="time" value={linia.horaFi} onChange={(e) => setLinia({ ...linia, horaFi: e.target.value })} style={{ width: '100%' }} />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label>Notes (opcional)</label>
            <input value={linia.notes} onChange={(e) => setLinia({ ...linia, notes: e.target.value })} placeholder="Ex: motiu de la trucada" style={{ width: '100%' }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={handleAfegirLinia}>+ Afegir línia</button>
            <button type="submit">Desar {pendents.length > 0 ? `(${pendents.length + (liniaValida(linia) ? 1 : 0)})` : ''}</button>
          </div>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, flexWrap: 'wrap', gap: 8 }}>
            <h2 style={{ fontSize: 18, margin: 0 }}>Totes les entrades</h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="month" value={mesFiltre} onChange={(e) => setMesFiltre(e.target.value)} style={{ fontSize: 13 }} />
              <button onClick={() => handleExportarPdf(totesFiltrats)} disabled={totesFiltrats.length === 0} style={{ fontSize: 13 }}>
                📄 Exportar PDF
              </button>
            </div>
          </div>
          {totesFiltrats.length === 0 ? (
            <p className="text-muted">Cap registre {mesFiltre ? 'en aquest mes' : 'encara'}.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {totesFiltrats.map((r) => targetaRegistre(r, true))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
