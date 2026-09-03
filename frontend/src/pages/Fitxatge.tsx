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
import {
  RegistreReten,
  TipusRegistreReten,
  crearRegistreReten,
  editarRegistreReten,
  eliminarRegistreReten,
  llistarRegistresReten,
} from '../services/registreReten';
import { useVistaTreballador } from '../utils/vistaTreballador';
import BotoTornar from '../components/BotoTornar';

const DIES_SETMANA = ['Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg'];
const MESOS = [
  'Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny',
  'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre',
];

const ETIQUETES_RETEN: Record<TipusRegistreReten, string> = {
  EXTRA_NORMAL: 'Hora extra normal',
  EXTRA_NOCTURNA: 'Hora extra nocturna',
  EXTRA_FESTIU: 'Hora extra dia festiu',
  TRUCADA: 'Trucada',
};

type TipusLinia = 'JORNADA' | TipusRegistreReten;

const ETIQUETES_TIPUS: Record<TipusLinia, string> = {
  JORNADA: 'Jornada de treball',
  ...ETIQUETES_RETEN,
};

interface LiniaUnificada {
  tipus: TipusLinia;
  llocTreballId: string;
  descripcio: string;
  horaInici: string;
  horaFi: string;
  notes: string;
}

const liniaBuida: LiniaUnificada = {
  tipus: 'JORNADA',
  llocTreballId: '',
  descripcio: '',
  horaInici: '',
  horaFi: '',
  notes: '',
};

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

function aHoraInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function combinar(data: string, hora: string): string {
  return new Date(`${data}T${hora}:00`).toISOString();
}

export default function FitxatgePage() {
  const usuariActual = getUsuariActual();
  const [vistaTreballador] = useVistaTreballador();
  const esEncarregat = usuariActual?.rol === 'ENCARREGAT' && !vistaTreballador;
  const avui = new Date();

  const [vista, setVista] = useState<'setmana' | 'mes'>('setmana');
  const [ancora, setAncora] = useState(new Date());
  const [seleccionat, setSeleccionat] = useState(new Date());

  const [fitxatges, setFitxatges] = useState<Fitxatge[]>([]);
  const [registres, setRegistres] = useState<RegistreReten[]>([]);
  const [llocs, setLlocs] = useState<LlocTreball[]>([]);
  const [franges, setFranges] = useState<FranjaHoraria[]>([]);
  const [carregant, setCarregant] = useState(true);
  const [error, setError] = useState('');

  const [mostrarFormulari, setMostrarFormulari] = useState(false);
  const [diaForm, setDiaForm] = useState(dataInputDeDate(new Date()));
  const [linia, setLinia] = useState<LiniaUnificada>(liniaBuida);
  const [pendents, setPendents] = useState<LiniaUnificada[]>([]);

  const [editantFitxatgeId, setEditantFitxatgeId] = useState<string | null>(null);
  const [editFitxatge, setEditFitxatge] = useState({ data: '', llocTreballId: '', descripcio: '' });

  const [editantRegistreId, setEditantRegistreId] = useState<string | null>(null);
  const [editRegistreData, setEditRegistreData] = useState('');
  const [editRegistreLinia, setEditRegistreLinia] = useState({ tipus: 'EXTRA_NORMAL' as TipusRegistreReten, horaInici: '', horaFi: '', notes: '' });

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
      const [dadesFitxatges, dadesRegistres, dadesLlocs, dadesFranges] = await Promise.all([
        llistarFitxatges(),
        llistarRegistresReten(),
        llistarLlocsTreball(),
        llistarFranges(),
      ]);
      setFitxatges(dadesFitxatges);
      setRegistres(dadesRegistres);
      setLlocs(dadesLlocs);
      setFranges(dadesFranges);
    } catch {
      setError("No s'han pogut carregar les dades");
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

  function liniaValida(l: LiniaUnificada): boolean {
    if (l.tipus === 'JORNADA') return !!l.llocTreballId && !!l.descripcio.trim();
    return !!l.horaInici && !!l.horaFi && l.horaFi > l.horaInici;
  }

  function handleAfegirLinia() {
    setError('');
    if (!liniaValida(linia)) {
      setError(linia.tipus === 'JORNADA' ? 'Cal indicar el lloc i què has fet' : "Indica de quina hora a quina hora (la fi ha de ser posterior a l'inici)");
      return;
    }
    setPendents((prev) => [...prev, linia]);
    setLinia({ ...liniaBuida, tipus: linia.tipus });
  }

  function handleTreureLinia(index: number) {
    setPendents((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleDesarTot(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const totes = [...pendents];
    if (liniaValida(linia)) totes.push(linia);
    if (totes.length === 0) {
      setError('Afegeix almenys una línia');
      return;
    }
    try {
      for (const l of totes) {
        if (l.tipus === 'JORNADA') {
          await crearFitxatge({ data: diaForm, llocTreballId: l.llocTreballId, descripcio: l.descripcio });
        } else {
          await crearRegistreReten({
            tipus: l.tipus,
            data: diaForm,
            horaInici: combinar(diaForm, l.horaInici),
            horaFi: combinar(diaForm, l.horaFi),
            notes: l.notes || undefined,
          });
        }
      }
      setPendents([]);
      setLinia({ ...liniaBuida, tipus: linia.tipus });
      setMostrarFormulari(false);
      carregar();
    } catch {
      setError("No s'han pogut desar totes les línies");
    }
  }

  function obrirEdicioFitxatge(f: Fitxatge) {
    setEditantFitxatgeId(editantFitxatgeId === f.id ? null : f.id);
    setEditFitxatge({ data: aDataInput(f.data), llocTreballId: f.llocTreballId, descripcio: f.descripcio });
  }

  async function handleGuardarFitxatge(e: React.FormEvent) {
    e.preventDefault();
    if (!editantFitxatgeId) return;
    setError('');
    if (!editFitxatge.descripcio.trim()) {
      setError('Cal indicar què has fet');
      return;
    }
    try {
      await editarFitxatge(editantFitxatgeId, editFitxatge);
      setEditantFitxatgeId(null);
      carregar();
    } catch {
      setError("No s'han pogut desar els canvis");
    }
  }

  async function handleEliminarFitxatge(id: string) {
    setError('');
    try {
      await eliminarFitxatge(id);
      carregar();
    } catch {
      setError("No s'ha pogut eliminar el fitxatge");
    }
  }

  function obrirEdicioRegistre(r: RegistreReten) {
    setEditantRegistreId(editantRegistreId === r.id ? null : r.id);
    setEditRegistreData(aDataInput(r.data));
    setEditRegistreLinia({ tipus: r.tipus, horaInici: aHoraInput(r.horaInici), horaFi: aHoraInput(r.horaFi), notes: r.notes || '' });
  }

  async function handleGuardarRegistre(e: React.FormEvent) {
    e.preventDefault();
    if (!editantRegistreId) return;
    setError('');
    if (!editRegistreLinia.horaInici || !editRegistreLinia.horaFi || editRegistreLinia.horaFi <= editRegistreLinia.horaInici) {
      setError("L'hora de fi ha de ser posterior a la d'inici");
      return;
    }
    try {
      await editarRegistreReten(editantRegistreId, {
        tipus: editRegistreLinia.tipus,
        data: editRegistreData,
        horaInici: combinar(editRegistreData, editRegistreLinia.horaInici),
        horaFi: combinar(editRegistreData, editRegistreLinia.horaFi),
        notes: editRegistreLinia.notes,
      });
      setEditantRegistreId(null);
      carregar();
    } catch {
      setError("No s'han pogut desar els canvis");
    }
  }

  async function handleEliminarRegistre(id: string) {
    setError('');
    try {
      await eliminarRegistreReten(id);
      carregar();
    } catch {
      setError("No s'ha pogut eliminar el registre");
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

  async function handleExportarPdf() {
    const { exportarPdfCombinat } = await import('../utils/pdfExport');
    exportarPdfCombinat(
      `Fitxatge${mesFiltre ? ` — ${mesFiltre}` : ''}`,
      [
        {
          titol: 'Jornades',
          items: equipFitxatgesFiltrats,
          columnes: ['Data', 'Franja', 'Hores', 'Lloc', 'Què ha fet'],
          getTreballador: (f: Fitxatge) => f.usuari.nom,
          getData: (f: Fitxatge) => f.data,
          getFila: (f: Fitxatge) => [new Date(f.data).toLocaleDateString('ca-ES'), f.franjaHoraria?.nom || '', f.hores ?? '', f.llocTreball.nom, f.descripcio],
        },
        {
          titol: 'Hores extra i trucades',
          items: equipRegistresFiltrats,
          columnes: ['Tipus', 'Data', 'De', 'A', 'Hores', 'Notes'],
          getTreballador: (r: RegistreReten) => r.usuari.nom,
          getData: (r: RegistreReten) => r.data,
          getFila: (r: RegistreReten) => [ETIQUETES_RETEN[r.tipus], new Date(r.data).toLocaleDateString('ca-ES'), aHoraInput(r.horaInici), aHoraInput(r.horaFi), r.quantitat, r.notes || ''],
        },
      ],
      `fitxatge${mesFiltre ? `_${mesFiltre}` : ''}.pdf`
    );
  }

  if (carregant) return <p className="page text-muted">Carregant fitxatge...</p>;

  const mevesFitxatges = fitxatges.filter((f) => f.usuariId === usuariActual?.id);
  const mevesRegistres = registres.filter((r) => r.usuariId === usuariActual?.id);
  const equipFitxatges = esEncarregat ? fitxatges : [];
  const equipRegistres = esEncarregat ? registres : [];
  const equipFitxatgesFiltrats = mesFiltre ? equipFitxatges.filter((f) => f.data.slice(0, 7) === mesFiltre) : equipFitxatges;
  const equipRegistresFiltrats = mesFiltre ? equipRegistres.filter((r) => r.data.slice(0, 7) === mesFiltre) : equipRegistres;

  function fitxatgesDe(d: Date) {
    return mevesFitxatges.filter((f) => mateixDia(new Date(f.data), d));
  }

  function registresDe(d: Date) {
    return mevesRegistres.filter((r) => mateixDia(new Date(r.data), d));
  }

  const esAvuiSeleccionat = mateixDia(seleccionat, avui);
  const fitxatgesDia = fitxatgesDe(seleccionat);
  const registresDia = registresDe(seleccionat);
  const diesVisibles = vista === 'setmana' ? diesDeLaSetmana(ancora) : graellaDelMes(ancora);

  function targetaFitxatge(f: Fitxatge, mostrarUsuari: boolean) {
    return (
      <div key={f.id} className="card" style={{ maxWidth: 480 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <strong>{f.llocTreball.nom}</strong>
          {f.hores != null && <span className="text-muted" style={{ fontSize: 12 }}>{f.hores}h</span>}
        </div>
        <p className="text-muted" style={{ fontSize: 13, margin: '4px 0 8px' }}>
          {mostrarUsuari && `${f.usuari.nom} · `}
          {mostrarUsuari && new Date(f.data).toLocaleDateString('ca-ES') + ' · '}
          {f.franjaHoraria && `${f.franjaHoraria.nom} · `}
          {f.descripcio}
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => obrirEdicioFitxatge(f)} style={{ fontSize: 12 }}>
            {editantFitxatgeId === f.id ? 'Cancel·lar' : 'Editar'}
          </button>
          <button onClick={() => handleEliminarFitxatge(f.id)} style={{ fontSize: 12, color: 'var(--c-error)' }}>
            Eliminar
          </button>
        </div>

        {editantFitxatgeId === f.id && (
          <form onSubmit={handleGuardarFitxatge} style={{ borderTop: '1px solid var(--c-border)', marginTop: 10, paddingTop: 10 }}>
            <div style={{ marginBottom: 8 }}>
              <label>Dia</label>
              <input type="date" value={editFitxatge.data} onChange={(e) => setEditFitxatge({ ...editFitxatge, data: e.target.value })} required style={{ width: '100%' }} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label>Lloc de treball</label>
              <select value={editFitxatge.llocTreballId} onChange={(e) => setEditFitxatge({ ...editFitxatge, llocTreballId: e.target.value })} required style={{ width: '100%' }}>
                <option value="">Selecciona...</option>
                {llocs.map((l) => (
                  <option key={l.id} value={l.id}>{l.nom}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label>Què has fet</label>
              <input value={editFitxatge.descripcio} onChange={(e) => setEditFitxatge({ ...editFitxatge, descripcio: e.target.value })} required style={{ width: '100%' }} />
            </div>
            <button type="submit">Desar canvis</button>
          </form>
        )}
      </div>
    );
  }

  function targetaRegistre(r: RegistreReten, mostrarUsuari: boolean) {
    return (
      <div key={r.id} className="card" style={{ maxWidth: 480 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <strong>{ETIQUETES_RETEN[r.tipus]}</strong>
          <span className="text-muted" style={{ fontSize: 12 }}>{r.quantitat}h</span>
        </div>
        <p className="text-muted" style={{ fontSize: 13, margin: '4px 0 8px' }}>
          {mostrarUsuari && `${r.usuari.nom} · `}
          {mostrarUsuari && new Date(r.data).toLocaleDateString('ca-ES') + ' · '}
          {aHoraInput(r.horaInici)} – {aHoraInput(r.horaFi)}
          {r.notes && ` · ${r.notes}`}
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => obrirEdicioRegistre(r)} style={{ fontSize: 12 }}>
            {editantRegistreId === r.id ? 'Cancel·lar' : 'Editar'}
          </button>
          <button onClick={() => handleEliminarRegistre(r.id)} style={{ fontSize: 12, color: 'var(--c-error)' }}>
            Eliminar
          </button>
        </div>

        {editantRegistreId === r.id && (
          <form onSubmit={handleGuardarRegistre} style={{ borderTop: '1px solid var(--c-border)', marginTop: 10, paddingTop: 10 }}>
            <div style={{ marginBottom: 8 }}>
              <label>Tipus</label>
              <select value={editRegistreLinia.tipus} onChange={(e) => setEditRegistreLinia({ ...editRegistreLinia, tipus: e.target.value as TipusRegistreReten })} style={{ width: '100%' }}>
                {Object.entries(ETIQUETES_RETEN).map(([valor, text]) => (
                  <option key={valor} value={valor}>{text}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label>Dia</label>
              <input type="date" value={editRegistreData} onChange={(e) => setEditRegistreData(e.target.value)} required style={{ width: '100%' }} />
            </div>
            <div style={{ marginBottom: 8, display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label>De quina hora</label>
                <input type="time" value={editRegistreLinia.horaInici} onChange={(e) => setEditRegistreLinia({ ...editRegistreLinia, horaInici: e.target.value })} required style={{ width: '100%' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label>A quina hora</label>
                <input type="time" value={editRegistreLinia.horaFi} onChange={(e) => setEditRegistreLinia({ ...editRegistreLinia, horaFi: e.target.value })} required style={{ width: '100%' }} />
              </div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label>Notes (opcional)</label>
              <input value={editRegistreLinia.notes} onChange={(e) => setEditRegistreLinia({ ...editRegistreLinia, notes: e.target.value })} style={{ width: '100%' }} />
            </div>
            <button type="submit">Desar canvis</button>
          </form>
        )}
      </div>
    );
  }

  function resumLinia(l: LiniaUnificada): string {
    if (l.tipus === 'JORNADA') {
      const lloc = llocs.find((x) => x.id === l.llocTreballId)?.nom || '';
      return `${lloc} · ${l.descripcio}`;
    }
    return `${l.horaInici}–${l.horaFi}${l.notes ? ` · ${l.notes}` : ''}`;
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

      <p className="text-muted" style={{ fontSize: 13 }}>
        Apunta aquí la teva jornada, i també les hores extres o trucades de quan estàs de retén.
      </p>

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
          const teAlgunaCosa = fitxatgesDe(d).length > 0 || registresDe(d).length > 0;
          return (
            <div key={i} className={classes.join(' ')} onClick={() => setSeleccionat(d)}>
              <span>{d.getDate()}</span>
              {teAlgunaCosa && (
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
            setDiaForm(dataInputDeDate(seleccionat));
            setLinia(liniaBuida);
            setPendents([]);
            setMostrarFormulari(!mostrarFormulari);
          }}
        >
          {mostrarFormulari ? 'Cancel·lar' : '+ Apuntar aquest dia'}
        </button>
      </div>

      {mostrarFormulari && (
        <form onSubmit={handleDesarTot} className="card" style={{ marginTop: 10, marginBottom: 20, maxWidth: 460 }}>
          <p className="text-muted" style={{ fontSize: 12, margin: '0 0 8px' }}>
            Pots afegir la jornada de treball i, si cal, hores extres o trucades — tot en una mateixa vegada.
          </p>

          {pendents.length > 0 && (
            <div style={{ overflowX: 'auto', marginBottom: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '4px 6px' }}>Tipus</th>
                    <th style={{ textAlign: 'left', padding: '4px 6px' }}>Detall</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pendents.map((l, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--c-border)' }}>
                      <td style={{ padding: '4px 6px' }}>{ETIQUETES_TIPUS[l.tipus]}</td>
                      <td style={{ padding: '4px 6px' }}>{resumLinia(l)}</td>
                      <td style={{ padding: '4px 6px' }}>
                        <button type="button" onClick={() => handleTreureLinia(i)} style={{ color: 'var(--c-error)', fontSize: 12 }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ marginBottom: 10 }}>
            <label>Tipus</label>
            <select value={linia.tipus} onChange={(e) => setLinia({ ...liniaBuida, tipus: e.target.value as TipusLinia })} style={{ width: '100%' }}>
              {Object.entries(ETIQUETES_TIPUS).map(([valor, text]) => (
                <option key={valor} value={valor}>{text}</option>
              ))}
            </select>
          </div>

          {linia.tipus === 'JORNADA' ? (
            <>
              <div style={{ marginBottom: 10 }}>
                <label>Lloc de treball</label>
                <select value={linia.llocTreballId} onChange={(e) => setLinia({ ...linia, llocTreballId: e.target.value })} style={{ width: '100%' }}>
                  <option value="">Selecciona...</option>
                  {llocs.map((l) => (
                    <option key={l.id} value={l.id}>{l.nom}</option>
                  ))}
                </select>
                {llocs.length === 0 && <p className="text-muted" style={{ fontSize: 12 }}>Encara no hi ha cap lloc creat. Demana a un encarregat que n'afegeixi.</p>}
              </div>
              <div style={{ marginBottom: 10 }}>
                <label>Què has fet</label>
                <input value={linia.descripcio} onChange={(e) => setLinia({ ...linia, descripcio: e.target.value })} style={{ width: '100%' }} />
              </div>
            </>
          ) : (
            <>
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
            </>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={handleAfegirLinia}>+ Afegir línia</button>
            <button type="submit">Desar {pendents.length > 0 ? `(${pendents.length + (liniaValida(linia) ? 1 : 0)})` : ''}</button>
          </div>
        </form>
      )}

      {fitxatgesDia.length === 0 && registresDia.length === 0 ? (
        <p className="text-muted" style={{ fontSize: 13 }}>Cap fitxatge apuntat aquest dia.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {fitxatgesDia.map((f) => targetaFitxatge(f, false))}
          {registresDia.map((r) => targetaRegistre(r, false))}
        </div>
      )}

      {esEncarregat && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, flexWrap: 'wrap', gap: 8 }}>
            <h2 style={{ fontSize: 18, margin: 0 }}>Activitat de l'equip</h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="month" value={mesFiltre} onChange={(e) => setMesFiltre(e.target.value)} style={{ fontSize: 13 }} />
              <button onClick={handleExportarPdf} disabled={equipFitxatgesFiltrats.length === 0 && equipRegistresFiltrats.length === 0} style={{ fontSize: 13 }}>
                📄 Exportar PDF
              </button>
            </div>
          </div>
          {equipFitxatgesFiltrats.length === 0 && equipRegistresFiltrats.length === 0 ? (
            <p className="text-muted">Cap activitat {mesFiltre ? 'en aquest mes' : 'registrada encara'}.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {equipFitxatgesFiltrats.map((f) => targetaFitxatge(f, true))}
              {equipRegistresFiltrats.map((r) => targetaRegistre(r, true))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
