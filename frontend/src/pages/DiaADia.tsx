import { useEffect, useState } from 'react';
import { getUsuariActual } from '../services/api';
import { Tasca, llistarTasques, crearTasca, canviarEstatTasca } from '../services/tasques';
import { Checklist, llistarChecklists, crearChecklist, marcarItem } from '../services/checklists';
import { CampFormulari, Formulari, crearFormulari, enviarResposta, llistarFormularis } from '../services/formularis';
import { Usuari, llistarUsuaris } from '../services/usuaris';
import { RetenActual, obtenirRetenActual } from '../services/reten';
import { QuinzenaActual, obtenirQuinzenaActual } from '../services/quinzena';
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

function dataInputAIso(d: Date) {
  const dt = new Date(d);
  dt.setHours(12, 0, 0, 0);
  return dt.toISOString();
}

export default function DiaADia() {
  const usuariActual = getUsuariActual();
  const esEncarregat = usuariActual?.rol === 'ENCARREGAT';
  const avui = new Date();

  const [vista, setVista] = useState<'setmana' | 'mes'>('setmana');
  const [ancora, setAncora] = useState(new Date());
  const [seleccionat, setSeleccionat] = useState(new Date());

  const [tasques, setTasques] = useState<Tasca[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [formularis, setFormularis] = useState<Formulari[]>([]);
  const [treballadors, setTreballadors] = useState<Usuari[]>([]);
  const [carregant, setCarregant] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const [reten, setReten] = useState<RetenActual | null>(null);
  const [quinzena, setQuinzena] = useState<QuinzenaActual | null>(null);

  const [mostrarNovaTasca, setMostrarNovaTasca] = useState(false);
  const [titolTasca, setTitolTasca] = useState('');
  const [descripcioTasca, setDescripcioTasca] = useState('');
  const [assignatsATasca, setAssignatsATasca] = useState<string[]>([]);
  const [assignatAlRetenTasca, setAssignatAlRetenTasca] = useState(false);
  const [assignatAQuinzenaTasca, setAssignatAQuinzenaTasca] = useState(false);
  const [prioritatTasca, setPrioritatTasca] = useState<'BAIXA' | 'MITJANA' | 'ALTA'>('MITJANA');
  const [repeticioTasca, setRepeticioTasca] = useState<'UNIC' | 'DIARIA' | 'SETMANAL'>('UNIC');

  const [mostrarNovaChecklist, setMostrarNovaChecklist] = useState(false);
  const [nomChecklist, setNomChecklist] = useState('');
  const [assignatChecklist, setAssignatChecklist] = useState('');
  const [assignatAlRetenChecklist, setAssignatAlRetenChecklist] = useState(false);
  const [assignatAQuinzenaChecklist, setAssignatAQuinzenaChecklist] = useState(false);
  const [frequenciaChecklist, setFrequenciaChecklist] = useState<'DIARIA' | 'SETMANAL' | 'PUNTUAL'>('PUNTUAL');
  const [itemsChecklist, setItemsChecklist] = useState('');

  const [formulariObert, setFormulariObert] = useState<string | null>(null);
  const [valorsFormulari, setValorsFormulari] = useState<Record<string, string>>({});

  const [mostrarNouFormulari, setMostrarNouFormulari] = useState(false);
  const [nomFormulariNou, setNomFormulariNou] = useState('');
  const [campsFormulariNou, setCampsFormulariNou] = useState('');

  async function carregar() {
    setCarregant(true);
    try {
      const [dadesTasques, dadesChecklists, dadesFormularis] = await Promise.all([
        llistarTasques(),
        llistarChecklists(),
        llistarFormularis(),
      ]);
      setTasques(dadesTasques);
      setChecklists(dadesChecklists);
      setFormularis(dadesFormularis);
      obtenirRetenActual().then(setReten).catch(() => setReten(null));
      obtenirQuinzenaActual().then(setQuinzena).catch(() => setQuinzena(null));
      if (esEncarregat) {
        const usuaris = await llistarUsuaris();
        setTreballadors(usuaris.filter((u) => u.actiu));
      }
    } catch {
      setError('No s\'han pogut carregar les dades del dia a dia');
    } finally {
      setCarregant(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function tasquesDe(d: Date) {
    return tasques.filter((t) => t.dataLimit && mateixDia(new Date(t.dataLimit), d));
  }

  function checklistsDe(d: Date) {
    return checklists.filter((c) => mateixDia(new Date(c.data), d));
  }

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

  function toggleAssignatTasca(id: string) {
    setAssignatsATasca((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleCrearTasca(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (assignatsATasca.length === 0 && !assignatAlRetenTasca && !assignatAQuinzenaTasca) {
      setError('Selecciona almenys un usuari, el reté o la quinzena');
      return;
    }
    try {
      await crearTasca({
        titol: titolTasca,
        descripcio: descripcioTasca || undefined,
        assignatsAIds: assignatsATasca,
        assignatAlReten: assignatAlRetenTasca,
        assignatAQuinzena: assignatAQuinzenaTasca,
        prioritat: prioritatTasca,
        dataLimit: dataInputAIso(seleccionat),
        repeticio: repeticioTasca,
      });
      setTitolTasca('');
      setDescripcioTasca('');
      setAssignatsATasca([]);
      setAssignatAlRetenTasca(false);
      setAssignatAQuinzenaTasca(false);
      setPrioritatTasca('MITJANA');
      setRepeticioTasca('UNIC');
      setMostrarNovaTasca(false);
      carregar();
    } catch {
      setError('No s\'ha pogut crear la tasca');
    }
  }

  async function handleCanviarEstatTasca(id: string, nouEstat: string) {
    setTasques((prev) => prev.map((t) => (t.id === id ? { ...t, estat: nouEstat as any } : t)));
    try {
      await canviarEstatTasca(id, nouEstat);
    } catch {
      setError('No s\'ha pogut actualitzar la tasca');
      carregar();
    }
  }

  async function handleCrearChecklist(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const items = itemsChecklist.split('\n').map((l) => l.trim()).filter(Boolean);
    if (items.length === 0) {
      setError('Afegeix almenys un ítem a la checklist');
      return;
    }
    if (!assignatChecklist && !assignatAlRetenChecklist && !assignatAQuinzenaChecklist) {
      setError('Selecciona un usuari, el reté o la quinzena');
      return;
    }
    try {
      await crearChecklist({
        nom: nomChecklist,
        assignatAId: assignatAlRetenChecklist || assignatAQuinzenaChecklist ? undefined : assignatChecklist,
        assignatAlReten: assignatAlRetenChecklist,
        assignatAQuinzena: assignatAQuinzenaChecklist,
        frequencia: frequenciaChecklist,
        items,
        data: dataInputAIso(seleccionat),
      });
      setNomChecklist('');
      setAssignatChecklist('');
      setAssignatAlRetenChecklist(false);
      setAssignatAQuinzenaChecklist(false);
      setFrequenciaChecklist('PUNTUAL');
      setItemsChecklist('');
      setMostrarNovaChecklist(false);
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

  function parsejarCampsFormulari(text: string): CampFormulari[] {
    return text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((linia) => {
        const [nomCamp, tipus, opcionsRaw] = linia.split('|').map((p) => p.trim());
        const camp: CampFormulari = { nom: nomCamp, tipus: (tipus as any) || 'text' };
        if (camp.tipus === 'seleccio' && opcionsRaw) {
          camp.opcions = opcionsRaw.split(',').map((o) => o.trim()).filter(Boolean);
        }
        return camp;
      });
  }

  async function handleCrearFormulari(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const camps = parsejarCampsFormulari(campsFormulariNou);
    if (camps.length === 0) {
      setError('Afegeix almenys un camp al formulari');
      return;
    }
    try {
      await crearFormulari(nomFormulariNou, camps);
      setNomFormulariNou('');
      setCampsFormulariNou('');
      setMostrarNouFormulari(false);
      carregar();
    } catch {
      setError("No s'ha pogut crear el formulari");
    }
  }

  function obrirFormulari(f: Formulari) {
    setFormulariObert(formulariObert === f.id ? null : f.id);
    setValorsFormulari({});
    setOk('');
  }

  async function handleEnviarResposta(e: React.FormEvent, formulariId: string) {
    e.preventDefault();
    setError('');
    try {
      await enviarResposta(formulariId, valorsFormulari);
      setOk('Resposta enviada correctament');
      setFormulariObert(null);
      setValorsFormulari({});
    } catch {
      setError('No s\'ha pogut enviar la resposta');
    }
  }

  if (carregant) return <p className="page text-muted">Carregant dia a dia...</p>;

  const esAvuiSeleccionat = mateixDia(seleccionat, avui);
  const tasquesDia = tasquesDe(seleccionat);
  const checklistsDia = checklistsDe(seleccionat);

  const diesVisibles = vista === 'setmana' ? diesDeLaSetmana(ancora) : graellaDelMes(ancora);

  return (
    <div className="page">
      <BotoTornar />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Dia a dia</h1>
        <button onClick={() => setVista(vista === 'setmana' ? 'mes' : 'setmana')}>
          Vista: {vista === 'setmana' ? 'Setmanal' : 'Mensual'}
        </button>
      </div>

      {error && <p className="text-error">{error}</p>}

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
          const nTasques = tasquesDe(d).length;
          const nChecklists = checklistsDe(d).length;
          return (
            <div key={i} className={classes.join(' ')} onClick={() => setSeleccionat(d)}>
              <span>{d.getDate()}</span>
              {(nTasques > 0 || nChecklists > 0) && (
                <div className="calendar-dots">
                  {nTasques > 0 && <span className="calendar-dot calendar-dot--tasca" />}
                  {nChecklists > 0 && <span className="calendar-dot calendar-dot--checklist" />}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <h2 style={{ marginTop: 28, fontSize: 18 }}>
        {seleccionat.toLocaleDateString('ca-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
        {esAvuiSeleccionat && ' (avui)'}
      </h2>

      {/* --- Tasques --- */}
      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>✅ Tasques</h3>
          {esEncarregat && (
            <button onClick={() => setMostrarNovaTasca(!mostrarNovaTasca)}>
              {mostrarNovaTasca ? 'Cancel·lar' : '+ Tasca'}
            </button>
          )}
        </div>

        {mostrarNovaTasca && (
          <form onSubmit={handleCrearTasca} className="card" style={{ marginTop: 10, maxWidth: 420 }}>
            <div style={{ marginBottom: 10 }}>
              <label>Títol</label>
              <input value={titolTasca} onChange={(e) => setTitolTasca(e.target.value)} required style={{ width: '100%' }} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label>Descripció (opcional)</label>
              <textarea value={descripcioTasca} onChange={(e) => setDescripcioTasca(e.target.value)} rows={2} style={{ width: '100%' }} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label>Assignar a</label>
              <div style={{ border: '1.5px solid var(--c-border)', borderRadius: 8, padding: 8, maxHeight: 140, overflowY: 'auto' }}>
                {treballadors.map((t) => (
                  <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                    <input type="checkbox" checked={assignatsATasca.includes(t.id)} onChange={() => toggleAssignatTasca(t.id)} />
                    {t.nom}
                  </label>
                ))}
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderTop: '1px solid var(--c-border)', marginTop: 4 }}>
                  <input type="checkbox" checked={assignatAlRetenTasca} onChange={(e) => setAssignatAlRetenTasca(e.target.checked)} />
                  📞 Reté d'aquesta setmana{reten?.usuari ? ` (${reten.usuari.nom})` : ''}
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                  <input type="checkbox" checked={assignatAQuinzenaTasca} onChange={(e) => setAssignatAQuinzenaTasca(e.target.checked)} />
                  🔁 Quinzena d'aquesta setmana{quinzena?.usuari ? ` (${quinzena.usuari.nom})` : ''}
                </label>
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label>Prioritat</label>
              <select value={prioritatTasca} onChange={(e) => setPrioritatTasca(e.target.value as any)} style={{ width: '100%' }}>
                <option value="BAIXA">Baixa</option>
                <option value="MITJANA">Mitjana</option>
                <option value="ALTA">Alta</option>
              </select>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label>Repetició</label>
              <select value={repeticioTasca} onChange={(e) => setRepeticioTasca(e.target.value as any)} style={{ width: '100%' }}>
                <option value="UNIC">Única</option>
                <option value="DIARIA">Diària</option>
                <option value="SETMANAL">Setmanal</option>
              </select>
            </div>
            <button type="submit">Crear tasca per aquest dia</button>
          </form>
        )}

        {tasquesDia.length === 0 ? (
          <p className="text-muted" style={{ fontSize: 13 }}>Cap tasca amb data límit aquest dia.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
            {tasquesDia.map((t) => (
              <div key={t.id} className="card" style={{ maxWidth: 480 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{t.titol}</strong>
                  <span className="text-muted" style={{ fontSize: 12 }}>{t.prioritat}</span>
                </div>
                <p className="text-muted" style={{ fontSize: 12, margin: '4px 0 8px' }}>
                  {[
                    ...t.assignatsA.map((u) => u.nom),
                    ...(t.assignatAlReten ? [`Reté${reten?.usuari ? ` (${reten.usuari.nom})` : ''}`] : []),
                    ...(t.assignatAQuinzena ? [`Quinzena${quinzena?.usuari ? ` (${quinzena.usuari.nom})` : ''}`] : []),
                  ].join(', ')}
                </p>
                <select value={t.estat} onChange={(e) => handleCanviarEstatTasca(t.id, e.target.value)}>
                  <option value="PENDENT">Pendent</option>
                  <option value="EN_CURS">En curs</option>
                  <option value="FETA">Feta</option>
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- Checklists --- */}
      <div style={{ marginTop: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>📋 Checklists</h3>
          {esEncarregat && (
            <button onClick={() => setMostrarNovaChecklist(!mostrarNovaChecklist)}>
              {mostrarNovaChecklist ? 'Cancel·lar' : '+ Checklist'}
            </button>
          )}
        </div>

        {mostrarNovaChecklist && (
          <form onSubmit={handleCrearChecklist} className="card" style={{ marginTop: 10, maxWidth: 420 }}>
            <div style={{ marginBottom: 10 }}>
              <label>Nom</label>
              <input value={nomChecklist} onChange={(e) => setNomChecklist(e.target.value)} required style={{ width: '100%' }} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label>Assignar a</label>
              <select
                value={assignatChecklist}
                onChange={(e) => setAssignatChecklist(e.target.value)}
                disabled={assignatAlRetenChecklist || assignatAQuinzenaChecklist}
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
                  checked={assignatAlRetenChecklist}
                  onChange={(e) => {
                    setAssignatAlRetenChecklist(e.target.checked);
                    if (e.target.checked) { setAssignatChecklist(''); setAssignatAQuinzenaChecklist(false); }
                  }}
                />
                📞 Reté d'aquesta setmana{reten?.usuari ? ` (${reten.usuari.nom})` : ''}
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontWeight: 400 }}>
                <input
                  type="checkbox"
                  checked={assignatAQuinzenaChecklist}
                  onChange={(e) => {
                    setAssignatAQuinzenaChecklist(e.target.checked);
                    if (e.target.checked) { setAssignatChecklist(''); setAssignatAlRetenChecklist(false); }
                  }}
                />
                🔁 Quinzena d'aquesta setmana{quinzena?.usuari ? ` (${quinzena.usuari.nom})` : ''}
              </label>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label>Repetició</label>
              <select value={frequenciaChecklist} onChange={(e) => setFrequenciaChecklist(e.target.value as any)} style={{ width: '100%' }}>
                <option value="PUNTUAL">Puntual (només aquest dia)</option>
                <option value="DIARIA">Diària</option>
                <option value="SETMANAL">Setmanal (mateix dia cada setmana)</option>
              </select>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label>Ítems (un per línia)</label>
              <textarea
                value={itemsChecklist}
                onChange={(e) => setItemsChecklist(e.target.value)}
                rows={3}
                placeholder={'Revisar stock\nTancar portes'}
                style={{ width: '100%' }}
                required
              />
            </div>
            <button type="submit">Crear checklist per aquest dia</button>
          </form>
        )}

        {checklistsDia.length === 0 ? (
          <p className="text-muted" style={{ fontSize: 13 }}>Cap checklist per aquest dia.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
            {checklistsDia.map((c) => {
              const fetes = c.items.filter((i) => i.marcat).length;
              return (
                <div key={c.id} className="card" style={{ maxWidth: 480 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{c.nom}</strong>
                    <span className="text-muted" style={{ fontSize: 12 }}>{fetes}/{c.items.length}</span>
                  </div>
                  <p className="text-muted" style={{ fontSize: 12, margin: '4px 0 8px' }}>
                    Assignat a {c.assignatAlReten
                      ? `Reté${reten?.usuari ? ` (${reten.usuari.nom})` : ''}`
                      : c.assignatAQuinzena
                      ? `Quinzena${quinzena?.usuari ? ` (${quinzena.usuari.nom})` : ''}`
                      : c.assignatA?.nom}
                  </p>
                  {c.items.map((item) => (
                    <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
                      <input type="checkbox" checked={item.marcat} onChange={() => handleToggleItem(item.id, item.marcat)} />
                      <span style={{ textDecoration: item.marcat ? 'line-through' : 'none', color: item.marcat ? '#aaa' : 'inherit', fontSize: 14 }}>
                        {item.text}
                      </span>
                    </label>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- Formularis --- */}
      <div style={{ marginTop: 28, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>📝 Formularis</h3>
          {esEncarregat && (
            <button onClick={() => setMostrarNouFormulari(!mostrarNouFormulari)}>
              {mostrarNouFormulari ? 'Cancel·lar' : '+ Nou formulari'}
            </button>
          )}
        </div>

        {ok && <p className="text-success" style={{ fontSize: 13 }}>{ok}</p>}

        {mostrarNouFormulari && (
          <form onSubmit={handleCrearFormulari} className="card" style={{ marginTop: 10, maxWidth: 480 }}>
            <div style={{ marginBottom: 10 }}>
              <label>Nom del formulari</label>
              <input value={nomFormulariNou} onChange={(e) => setNomFormulariNou(e.target.value)} required style={{ width: '100%' }} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label>Camps (un per línia: nom | tipus | opcions)</label>
              <textarea
                value={campsFormulariNou}
                onChange={(e) => setCampsFormulariNou(e.target.value)}
                rows={4}
                placeholder={'Descripció | text\nQuantitat afectada | numero\nEstat | seleccio | Bo,Regular,Dolent'}
                style={{ width: '100%', fontFamily: 'monospace' }}
                required
              />
              <p className="text-muted" style={{ fontSize: 12, margin: '4px 0 0' }}>
                Tipus disponibles: text, numero, seleccio (opcions separades per comes, només per a seleccio)
              </p>
            </div>
            <button type="submit">Crear formulari</button>
          </form>
        )}

        {formularis.length === 0 ? (
          <p className="text-muted" style={{ fontSize: 13 }}>No hi ha formularis disponibles.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
            {formularis.map((f) => (
              <div key={f.id} className="card" style={{ maxWidth: 480 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{f.nom}</strong>
                  {esAvuiSeleccionat ? (
                    <button onClick={() => obrirFormulari(f)}>{formulariObert === f.id ? 'Tancar' : 'Omplir'}</button>
                  ) : (
                    <span className="text-muted" style={{ fontSize: 12 }}>Omple'l avui</span>
                  )}
                </div>
                {formulariObert === f.id && (
                  <form onSubmit={(e) => handleEnviarResposta(e, f.id)} style={{ marginTop: 12, borderTop: '1px solid var(--c-border)', paddingTop: 12 }}>
                    {f.camps.map((camp: CampFormulari) => (
                      <div key={camp.nom} style={{ marginBottom: 10 }}>
                        <label>{camp.nom}</label>
                        {camp.tipus === 'seleccio' ? (
                          <select
                            value={valorsFormulari[camp.nom] || ''}
                            onChange={(e) => setValorsFormulari({ ...valorsFormulari, [camp.nom]: e.target.value })}
                            required
                            style={{ width: '100%' }}
                          >
                            <option value="">Selecciona...</option>
                            {(camp.opcions || []).map((op) => (
                              <option key={op} value={op}>{op}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={camp.tipus === 'numero' ? 'number' : 'text'}
                            value={valorsFormulari[camp.nom] || ''}
                            onChange={(e) => setValorsFormulari({ ...valorsFormulari, [camp.nom]: e.target.value })}
                            required
                            style={{ width: '100%' }}
                          />
                        )}
                      </div>
                    ))}
                    <button type="submit">Enviar resposta</button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
