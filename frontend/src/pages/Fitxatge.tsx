import { useEffect, useState } from 'react';
import { getUsuariActual } from '../services/api';
import {
  Fitxatge,
  FranjaHoraria,
  LlocTreball,
  crearFitxatge,
  crearFranja,
  crearLlocTreball,
  editarFitxatge,
  editarFranja,
  editarLlocTreball,
  eliminarFitxatge,
  eliminarFranja,
  eliminarLlocTreball,
  llistarFitxatges,
  llistarFranges,
  llistarLlocsTreball,
} from '../services/fitxatge';
import BotoTornar from '../components/BotoTornar';

const DIES_SETMANA = ['Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg'];
const MESOS = [
  'Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny',
  'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre',
];

function mateixDia(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function inicioSetmana(d: Date) {
  const dt = new Date(d);
  const dow = (dt.getDay() + 6) % 7;
  dt.setDate(dt.getDate() - dow);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function diesDeLaSetmana(ancora: Date) {
  const inici = inicioSetmana(ancora);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(inici);
    d.setDate(inici.getDate() + i);
    return d;
  });
}

function graellaDelMes(ancora: Date) {
  const primerDia = new Date(ancora.getFullYear(), ancora.getMonth(), 1);
  const inici = inicioSetmana(primerDia);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(inici);
    d.setDate(inici.getDate() + i);
    return d;
  });
}

function dataInputDeDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function aDataInput(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

const buit = { data: dataInputDeDate(new Date()), llocTreballId: '', franjaHorariaId: '', descripcio: '' };

export default function FitxatgePage() {
  const usuariActual = getUsuariActual();
  const esEncarregat = usuariActual?.rol === 'ENCARREGAT';
  const avui = new Date();

  const [vista, setVista] = useState<'setmana' | 'mes'>('setmana');
  const [ancora, setAncora] = useState(new Date());
  const [seleccionat, setSeleccionat] = useState(new Date());

  const [fitxatges, setFitxatges] = useState<Fitxatge[]>([]);
  const [llocs, setLlocs] = useState<LlocTreball[]>([]);
  const [franges, setFranges] = useState<FranjaHoraria[]>([]);
  const [carregant, setCarregant] = useState(true);
  const [error, setError] = useState('');
  const [mostrarFormulari, setMostrarFormulari] = useState(false);
  const [form, setForm] = useState(buit);

  const [editantId, setEditantId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(buit);

  const [mesFiltre, setMesFiltre] = useState('');

  const [mostrarGestio, setMostrarGestio] = useState(false);
  const [nouLloc, setNouLloc] = useState('');
  const [editantLlocId, setEditantLlocId] = useState<string | null>(null);
  const [editLloc, setEditLloc] = useState('');
  const [novaFranjaNom, setNovaFranjaNom] = useState('');
  const [novaFranjaHores, setNovaFranjaHores] = useState('');
  const [editantFranjaId, setEditantFranjaId] = useState<string | null>(null);
  const [editFranjaNom, setEditFranjaNom] = useState('');
  const [editFranjaHores, setEditFranjaHores] = useState('');

  async function carregar() {
    setCarregant(true);
    try {
      const [dadesFitxatges, dadesLlocs, dadesFranges] = await Promise.all([
        llistarFitxatges(),
        llistarLlocsTreball(),
        llistarFranges(),
      ]);
      setFitxatges(dadesFitxatges);
      setLlocs(dadesLlocs);
      setFranges(dadesFranges);
    } catch {
      setError("No s'han pogut carregar els fitxatges");
    } finally {
      setCarregant(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function anarAvui() {
    setAncora(new Date());
    setSeleccionat(new Date());
  }

  function moure(delta: number) {
    const nova = new Date(ancora);
    if (vista === 'setmana') nova.setDate(nova.getDate() + delta * 7);
    else nova.setMonth(nova.getMonth() + delta);
    setAncora(nova);
  }

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.llocTreballId || !form.franjaHorariaId || !form.descripcio.trim()) {
      setError('Cal indicar el lloc, la franja horària i què has fet');
      return;
    }
    try {
      await crearFitxatge(form);
      setForm({ ...buit, data: dataInputDeDate(seleccionat) });
      setMostrarFormulari(false);
      carregar();
    } catch {
      setError("No s'ha pogut desar el fitxatge");
    }
  }

  function obrirEdicio(f: Fitxatge) {
    setEditantId(editantId === f.id ? null : f.id);
    setEditForm({
      data: aDataInput(f.data),
      llocTreballId: f.llocTreballId,
      franjaHorariaId: f.franjaHorariaId,
      descripcio: f.descripcio,
    });
  }

  async function handleGuardarEdicio(e: React.FormEvent) {
    e.preventDefault();
    if (!editantId) return;
    setError('');
    if (!editForm.descripcio.trim()) {
      setError('Cal indicar què has fet');
      return;
    }
    try {
      await editarFitxatge(editantId, editForm);
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

  // --- Gestió de llocs de treball ---
  async function handleCrearLloc(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await crearLlocTreball(nouLloc);
      setNouLloc('');
      carregar();
    } catch {
      setError('No s\'ha pogut crear el lloc (potser ja existeix)');
    }
  }

  function obrirEdicioLloc(l: LlocTreball) {
    setEditantLlocId(editantLlocId === l.id ? null : l.id);
    setEditLloc(l.nom);
  }

  async function handleGuardarLloc(e: React.FormEvent) {
    e.preventDefault();
    if (!editantLlocId) return;
    setError('');
    try {
      await editarLlocTreball(editantLlocId, editLloc);
      setEditantLlocId(null);
      carregar();
    } catch {
      setError('No s\'ha pogut actualitzar el lloc');
    }
  }

  async function handleEliminarLloc(id: string) {
    setError('');
    try {
      await eliminarLlocTreball(id);
      carregar();
    } catch {
      setError('No es pot eliminar: aquest lloc té fitxatges associats.');
    }
  }

  // --- Gestió de franges horàries ---
  async function handleCrearFranja(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await crearFranja(novaFranjaNom, Number(novaFranjaHores));
      setNovaFranjaNom('');
      setNovaFranjaHores('');
      carregar();
    } catch {
      setError('No s\'ha pogut crear la franja (potser ja existeix)');
    }
  }

  function obrirEdicioFranja(f: FranjaHoraria) {
    setEditantFranjaId(editantFranjaId === f.id ? null : f.id);
    setEditFranjaNom(f.nom);
    setEditFranjaHores(String(f.hores));
  }

  async function handleGuardarFranja(e: React.FormEvent) {
    e.preventDefault();
    if (!editantFranjaId) return;
    setError('');
    try {
      await editarFranja(editantFranjaId, editFranjaNom, Number(editFranjaHores));
      setEditantFranjaId(null);
      carregar();
    } catch {
      setError('No s\'ha pogut actualitzar la franja');
    }
  }

  async function handleEliminarFranja(id: string) {
    setError('');
    try {
      await eliminarFranja(id);
      carregar();
    } catch {
      setError('No es pot eliminar: aquesta franja té fitxatges associats.');
    }
  }

  async function handleExportarPdf(files: Fitxatge[]) {
    const { exportarPdf } = await import('../utils/pdfExport');
    exportarPdf(
      `Fitxatges${mesFiltre ? ` — ${mesFiltre}` : ''}`,
      ['Treballador', 'Data', 'Franja', 'Hores', 'Lloc', 'Què ha fet'],
      files.map((f) => [f.usuari.nom, new Date(f.data).toLocaleDateString('ca-ES'), f.franjaHoraria.nom, f.hores, f.llocTreball.nom, f.descripcio]),
      `fitxatges${mesFiltre ? `_${mesFiltre}` : ''}.pdf`
    );
  }

  if (carregant) return <p className="page text-muted">Carregant fitxatge...</p>;

  const mevesFitxatges = fitxatges.filter((f) => f.usuariId === usuariActual?.id);
  const equipFitxatges = esEncarregat ? fitxatges : [];
  const equipFiltrats = mesFiltre ? equipFitxatges.filter((f) => f.data.slice(0, 7) === mesFiltre) : equipFitxatges;

  function fitxatgesDe(d: Date) {
    return mevesFitxatges.filter((f) => mateixDia(new Date(f.data), d));
  }

  const esAvuiSeleccionat = mateixDia(seleccionat, avui);
  const fitxatgesDia = fitxatgesDe(seleccionat);
  const diesVisibles = vista === 'setmana' ? diesDeLaSetmana(ancora) : graellaDelMes(ancora);

  function targetaFitxatge(f: Fitxatge, mostrarUsuari: boolean) {
    return (
      <div key={f.id} className="card" style={{ maxWidth: 480 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <strong>{f.franjaHoraria.nom}</strong>
          <span className="text-muted" style={{ fontSize: 12 }}>{f.hores}h</span>
        </div>
        <p className="text-muted" style={{ fontSize: 13, margin: '4px 0 8px' }}>
          {mostrarUsuari && `${f.usuari.nom} · `}
          {mostrarUsuari && new Date(f.data).toLocaleDateString('ca-ES') + ' · '}
          {f.llocTreball.nom} · {f.descripcio}
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
            <div style={{ marginBottom: 8 }}>
              <label>Lloc de treball</label>
              <select value={editForm.llocTreballId} onChange={(e) => setEditForm({ ...editForm, llocTreballId: e.target.value })} required style={{ width: '100%' }}>
                <option value="">Selecciona...</option>
                {llocs.map((l) => (
                  <option key={l.id} value={l.id}>{l.nom}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label>Franja horària</label>
              <select value={editForm.franjaHorariaId} onChange={(e) => setEditForm({ ...editForm, franjaHorariaId: e.target.value })} required style={{ width: '100%' }}>
                <option value="">Selecciona...</option>
                {franges.map((fr) => (
                  <option key={fr.id} value={fr.id}>{fr.nom} ({fr.hores}h)</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label>Què has fet</label>
              <input value={editForm.descripcio} onChange={(e) => setEditForm({ ...editForm, descripcio: e.target.value })} required style={{ width: '100%' }} />
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h1>Fitxatge</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {esEncarregat && (
            <button onClick={() => setMostrarGestio(!mostrarGestio)} style={{ fontSize: 13 }}>
              {mostrarGestio ? 'Tancar gestió' : '⚙️ Llocs i franges'}
            </button>
          )}
          <button onClick={() => setVista(vista === 'setmana' ? 'mes' : 'setmana')} style={{ fontSize: 13 }}>
            Vista: {vista === 'setmana' ? 'Setmanal' : 'Mensual'}
          </button>
        </div>
      </div>

      {error && <p className="text-error">{error}</p>}

      {mostrarGestio && (
        <div className="card" style={{ marginBottom: 20, maxWidth: 460 }}>
          <h3 style={{ marginTop: 0, fontSize: 15 }}>Llocs de treball</h3>
          {llocs.map((l) => (
            <div key={l.id} style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13 }}>{l.nom}</span>
                <span style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => obrirEdicioLloc(l)} style={{ fontSize: 12 }}>{editantLlocId === l.id ? 'Cancel·lar' : 'Editar'}</button>
                  <button onClick={() => handleEliminarLloc(l.id)} style={{ fontSize: 12, color: 'var(--c-error)' }}>Eliminar</button>
                </span>
              </div>
              {editantLlocId === l.id && (
                <form onSubmit={handleGuardarLloc} style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <input value={editLloc} onChange={(e) => setEditLloc(e.target.value)} required style={{ flex: 1 }} />
                  <button type="submit">Desar</button>
                </form>
              )}
            </div>
          ))}
          <form onSubmit={handleCrearLloc} style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <input value={nouLloc} onChange={(e) => setNouLloc(e.target.value)} placeholder="Nou lloc de treball" required style={{ flex: 1 }} />
            <button type="submit">Afegir</button>
          </form>

          <h3 style={{ fontSize: 15, marginTop: 20 }}>Franges horàries</h3>
          {franges.map((fr) => (
            <div key={fr.id} style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13 }}>{fr.nom} — {fr.hores}h</span>
                <span style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => obrirEdicioFranja(fr)} style={{ fontSize: 12 }}>{editantFranjaId === fr.id ? 'Cancel·lar' : 'Editar'}</button>
                  <button onClick={() => handleEliminarFranja(fr.id)} style={{ fontSize: 12, color: 'var(--c-error)' }}>Eliminar</button>
                </span>
              </div>
              {editantFranjaId === fr.id && (
                <form onSubmit={handleGuardarFranja} style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <input value={editFranjaNom} onChange={(e) => setEditFranjaNom(e.target.value)} style={{ flex: 2 }} />
                  <input type="number" step="0.5" value={editFranjaHores} onChange={(e) => setEditFranjaHores(e.target.value)} style={{ flex: 1 }} />
                  <button type="submit">Desar</button>
                </form>
              )}
            </div>
          ))}
          <form onSubmit={handleCrearFranja} style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <input value={novaFranjaNom} onChange={(e) => setNovaFranjaNom(e.target.value)} placeholder="Ex: Matí (8-14)" required style={{ flex: 2 }} />
            <input type="number" step="0.5" value={novaFranjaHores} onChange={(e) => setNovaFranjaHores(e.target.value)} placeholder="Hores" required style={{ flex: 1 }} />
            <button type="submit">Afegir</button>
          </form>
        </div>
      )}

      <div className="calendar-toolbar">
        <button onClick={() => moure(-1)}>‹</button>
        <span className="calendar-toolbar__label">
          {vista === 'mes'
            ? `${MESOS[ancora.getMonth()]} ${ancora.getFullYear()}`
            : `Setmana del ${inicioSetmana(ancora).toLocaleDateString('ca-ES')}`}
        </span>
        <button onClick={() => moure(1)}>›</button>
        <button onClick={anarAvui}>Avui</button>
      </div>

      <div className="calendar-grid">
        {DIES_SETMANA.map((d) => (
          <div key={d} className="calendar-weekday">{d}</div>
        ))}
        {diesVisibles.map((d, i) => {
          const esDelMesActual = vista === 'setmana' || d.getMonth() === ancora.getMonth();
          const classes = ['calendar-cell'];
          if (!esDelMesActual) classes.push('calendar-cell--muted');
          if (mateixDia(d, avui)) classes.push('calendar-cell--today');
          if (mateixDia(d, seleccionat)) classes.push('calendar-cell--selected');
          const teFitxatge = fitxatgesDe(d).length > 0;
          return (
            <div key={i} className={classes.join(' ')} onClick={() => setSeleccionat(d)}>
              <span>{d.getDate()}</span>
              {teFitxatge && (
                <div className="calendar-dots">
                  <span className="calendar-dot calendar-dot--fitxatge" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>
          {seleccionat.toLocaleDateString('ca-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          {esAvuiSeleccionat && ' (avui)'}
        </h2>
        <button
          onClick={() => {
            setForm({ ...buit, data: dataInputDeDate(seleccionat) });
            setMostrarFormulari(!mostrarFormulari);
          }}
        >
          {mostrarFormulari ? 'Cancel·lar' : '+ Apuntar aquest dia'}
        </button>
      </div>

      {mostrarFormulari && (
        <form onSubmit={handleCrear} className="card" style={{ marginTop: 10, marginBottom: 20, maxWidth: 420 }}>
          <div style={{ marginBottom: 10 }}>
            <label>Dia</label>
            <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} required style={{ width: '100%' }} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label>Lloc de treball</label>
            <select value={form.llocTreballId} onChange={(e) => setForm({ ...form, llocTreballId: e.target.value })} required style={{ width: '100%' }}>
              <option value="">Selecciona...</option>
              {llocs.map((l) => (
                <option key={l.id} value={l.id}>{l.nom}</option>
              ))}
            </select>
            {llocs.length === 0 && <p className="text-muted" style={{ fontSize: 12 }}>Encara no hi ha cap lloc creat. Demana a un encarregat que n'afegeixi.</p>}
          </div>
          <div style={{ marginBottom: 10 }}>
            <label>Franja horària</label>
            <select value={form.franjaHorariaId} onChange={(e) => setForm({ ...form, franjaHorariaId: e.target.value })} required style={{ width: '100%' }}>
              <option value="">Selecciona...</option>
              {franges.map((fr) => (
                <option key={fr.id} value={fr.id}>{fr.nom} ({fr.hores}h)</option>
              ))}
            </select>
            {franges.length === 0 && <p className="text-muted" style={{ fontSize: 12 }}>Encara no hi ha cap franja creada. Demana a un encarregat que n'afegeixi.</p>}
          </div>
          <div style={{ marginBottom: 10 }}>
            <label>Què has fet</label>
            <input value={form.descripcio} onChange={(e) => setForm({ ...form, descripcio: e.target.value })} required style={{ width: '100%' }} />
          </div>
          <button type="submit">Desar fitxatge</button>
        </form>
      )}

      {fitxatgesDia.length === 0 ? (
        <p className="text-muted" style={{ fontSize: 13 }}>Cap fitxatge apuntat aquest dia.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {fitxatgesDia.map((f) => targetaFitxatge(f, false))}
        </div>
      )}

      {esEncarregat && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, flexWrap: 'wrap', gap: 8 }}>
            <h2 style={{ fontSize: 18, margin: 0 }}>Fitxatges de l'equip</h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="month" value={mesFiltre} onChange={(e) => setMesFiltre(e.target.value)} style={{ fontSize: 13 }} />
              <button onClick={() => handleExportarPdf(equipFiltrats)} disabled={equipFiltrats.length === 0} style={{ fontSize: 13 }}>
                📄 Exportar PDF
              </button>
            </div>
          </div>
          {equipFiltrats.length === 0 ? (
            <p className="text-muted">Cap fitxatge {mesFiltre ? 'en aquest mes' : 'registrat encara'}.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {equipFiltrats.map((f) => targetaFitxatge(f, true))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
