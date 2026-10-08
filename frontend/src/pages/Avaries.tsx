import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  Avaria,
  afegirSolucioAvaria,
  crearAvaria,
  demanarDiagnostic,
  errorAvaries,
  llistarAvaries,
  obtenirEstatAvaries,
  obtenirFotoAvariaUrl,
} from '../services/avaries';
import BotoTornar from '../components/BotoTornar';

function llegirComABase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Lectura del fitxer fallida'));
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.readAsDataURL(file);
  });
}

export default function Avaries() {
  const [iaConfigurada, setIaConfigurada] = useState(true);
  const [avaries, setAvaries] = useState<Avaria[]>([]);
  const [fotos, setFotos] = useState<Record<string, string>>({});
  const [carregant, setCarregant] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  // Diagnòstic amb IA
  const [diagDescripcio, setDiagDescripcio] = useState('');
  const [diagFoto, setDiagFoto] = useState<{ nom: string; base64: string } | null>(null);
  const diagFileInput = useRef<HTMLInputElement>(null);
  const [diagnosticant, setDiagnosticant] = useState(false);
  const [resultat, setResultat] = useState<{ suggeriment: string; casosConsultats: number } | null>(null);

  // Registrar una avaria
  const [problema, setProblema] = useState('');
  const [solucio, setSolucio] = useState('');
  const [regFoto, setRegFoto] = useState<{ nom: string; base64: string } | null>(null);
  const regFileInput = useRef<HTMLInputElement>(null);
  const [registrant, setRegistrant] = useState(false);

  const [editantSolucioId, setEditantSolucioId] = useState<string | null>(null);
  const [editSolucio, setEditSolucio] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  async function carregar() {
    setCarregant(true);
    try {
      const [est, llista] = await Promise.all([obtenirEstatAvaries(), llistarAvaries()]);
      setIaConfigurada(est.iaConfigurada);
      setAvaries(llista);
      const entrades = await Promise.all(
        llista.filter((a) => a.teFoto).map(async (a) => [a.id, await obtenirFotoAvariaUrl(a.id)] as const)
      );
      setFotos(Object.fromEntries(entrades.filter((e): e is [string, string] => !!e[1])));
    } catch (e) {
      setError(errorAvaries(e));
    } finally {
      setCarregant(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function triarFoto(fitxers: FileList | null, setter: (v: { nom: string; base64: string } | null) => void, inputRef: React.RefObject<HTMLInputElement>) {
    const file = fitxers?.[0];
    if (!file) return;
    setError('');
    if (file.size > 8 * 1024 * 1024) {
      setError('La foto ha de pesar com a màxim 8 MB');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    try {
      setter({ nom: file.name, base64: await llegirComABase64(file) });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleDiagnosticar(e: FormEvent) {
    e.preventDefault();
    if (!diagFoto) return;
    setError('');
    setResultat(null);
    setDiagnosticant(true);
    try {
      const r = await demanarDiagnostic({ descripcio: diagDescripcio, fotoBase64: diagFoto.base64, fotoNomFitxer: diagFoto.nom });
      setResultat(r);
    } catch (e) {
      setError(errorAvaries(e));
    } finally {
      setDiagnosticant(false);
    }
  }

  async function handleRegistrar(e: FormEvent) {
    e.preventDefault();
    if (!problema.trim()) return;
    setError('');
    setOk('');
    setRegistrant(true);
    try {
      await crearAvaria({
        problema: problema.trim(),
        ...(solucio.trim() ? { solucio: solucio.trim() } : {}),
        ...(regFoto ? { fotoBase64: regFoto.base64, fotoNomFitxer: regFoto.nom } : {}),
      });
      setProblema('');
      setSolucio('');
      setRegFoto(null);
      if (regFileInput.current) regFileInput.current.value = '';
      setOk('Avaria registrada. Gràcies, ajudarà a diagnosticar casos futurs.');
      await carregar();
    } catch (e) {
      setError(errorAvaries(e));
    } finally {
      setRegistrant(false);
    }
  }

  function obrirEdicioSolucio(a: Avaria) {
    setEditantSolucioId(editantSolucioId === a.id ? null : a.id);
    setEditSolucio(a.solucio || '');
  }

  async function handleGuardarSolucio(id: string) {
    setBusyId(id);
    setError('');
    try {
      await afegirSolucioAvaria(id, editSolucio.trim());
      setEditantSolucioId(null);
      await carregar();
    } catch (e) {
      setError(errorAvaries(e));
    } finally {
      setBusyId(null);
    }
  }

  if (carregant) return <p className="page text-muted">Carregant avaries...</p>;

  return (
    <div className="page">
      <BotoTornar />
      <h1>Avaries</h1>
      <p className="text-muted" style={{ fontSize: 13 }}>
        Registra avaries i com es van resoldre (fotos incloses) perquè quedin com a referència. Amb una foto nova,
        la IA compara el cas amb els anteriors i suggereix una possible causa.
      </p>

      {error && <p className="text-error">{error}</p>}
      {ok && <p className="text-success">{ok}</p>}

      <h2 style={{ fontSize: 18 }}>Demanar diagnòstic a la IA</h2>
      {!iaConfigurada && (
        <p className="text-muted" style={{ fontSize: 13 }}>
          La IA no està configurada al servidor (falta IA_GEMINI_API_KEY). Igualment pots registrar avaries més avall.
        </p>
      )}
      <form onSubmit={handleDiagnosticar} className="card" style={{ marginBottom: 24, width: '100%' }}>
        <label htmlFor="diag-foto">Foto de l'avaria</label>
        <input ref={diagFileInput} id="diag-foto" type="file" accept=".png,.jpg,.jpeg" disabled={diagnosticant} onChange={(e) => triarFoto(e.target.files, setDiagFoto, diagFileInput)} required />
        {diagFoto && <p className="text-muted" style={{ fontSize: 12 }}>Foto seleccionada: {diagFoto.nom}</p>}
        <label htmlFor="diag-descripcio" style={{ marginTop: 8, display: 'block' }}>Símptomes (opcional)</label>
        <textarea id="diag-descripcio" value={diagDescripcio} onChange={(e) => setDiagDescripcio(e.target.value)} rows={2} maxLength={2000} placeholder="Ex: s'ha perdut la comunicació amb la caseta X des d'ahir" style={{ width: '100%' }} disabled={diagnosticant} />
        <button type="submit" disabled={diagnosticant || !diagFoto || !iaConfigurada} style={{ marginTop: 10 }}>
          {diagnosticant ? 'Analitzant…' : 'Preguntar a la IA'}
        </button>
      </form>

      {resultat && (
        <div className="card card--warning" style={{ marginBottom: 24, width: '100%' }}>
          <strong>Suggeriment de la IA</strong>
          <p style={{ whiteSpace: 'pre-wrap', margin: '8px 0 0' }}>{resultat.suggeriment}</p>
          <p className="text-muted" style={{ fontSize: 12, marginTop: 8 }}>Basat en {resultat.casosConsultats} cas{resultat.casosConsultats === 1 ? '' : 's'} anterior{resultat.casosConsultats === 1 ? '' : 's'} resol{resultat.casosConsultats === 1 ? 't' : 'ts'}.</p>
        </div>
      )}

      <h2 style={{ fontSize: 18 }}>Registrar una avaria</h2>
      <form onSubmit={handleRegistrar} className="card" style={{ marginBottom: 24, width: '100%' }}>
        <label htmlFor="reg-problema">Què ha fallat</label>
        <textarea id="reg-problema" value={problema} onChange={(e) => setProblema(e.target.value)} rows={2} maxLength={2000} required style={{ width: '100%' }} disabled={registrant} />
        <label htmlFor="reg-solucio" style={{ marginTop: 8, display: 'block' }}>Com s'ha arreglat (deixa-ho buit si encara no ho saps)</label>
        <textarea id="reg-solucio" value={solucio} onChange={(e) => setSolucio(e.target.value)} rows={2} maxLength={2000} style={{ width: '100%' }} disabled={registrant} />
        <label htmlFor="reg-foto" style={{ marginTop: 8, display: 'block' }}>Foto (opcional)</label>
        <input ref={regFileInput} id="reg-foto" type="file" accept=".png,.jpg,.jpeg" disabled={registrant} onChange={(e) => triarFoto(e.target.files, setRegFoto, regFileInput)} />
        {regFoto && <p className="text-muted" style={{ fontSize: 12 }}>Foto seleccionada: {regFoto.nom}</p>}
        <button type="submit" disabled={registrant || !problema.trim()} style={{ marginTop: 10 }}>
          {registrant ? 'Desant…' : 'Registrar avaria'}
        </button>
      </form>

      <h2 style={{ fontSize: 18 }}>Historial d'avaries</h2>
      {avaries.length === 0 ? (
        <p className="text-muted">Encara no hi ha cap avaria registrada.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {avaries.map((a) => (
            <div key={a.id} className="card" style={{ width: '100%' }}>
              {fotos[a.id] && <img src={fotos[a.id]} alt="" style={{ maxWidth: '100%', maxHeight: 280, borderRadius: 6, marginBottom: 8 }} />}
              <p style={{ margin: '0 0 6px' }}><strong>Problema:</strong> {a.problema}</p>
              {editantSolucioId === a.id ? (
                <>
                  <textarea value={editSolucio} onChange={(e) => setEditSolucio(e.target.value)} rows={2} maxLength={2000} style={{ width: '100%' }} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button disabled={busyId === a.id} onClick={() => handleGuardarSolucio(a.id)}>Desar</button>
                    <button disabled={busyId === a.id} onClick={() => setEditantSolucioId(null)}>Cancel·lar</button>
                  </div>
                </>
              ) : (
                <>
                  <p style={{ margin: '0 0 6px' }}>
                    <strong>Solució:</strong> {a.solucio || <span className="text-muted">Pendent</span>}
                  </p>
                  <p className="text-muted" style={{ fontSize: 12 }}>{a.usuariNom} · {new Date(a.creatEl).toLocaleString('ca-ES')}</p>
                  <button disabled={busyId === a.id} onClick={() => obrirEdicioSolucio(a)} style={{ fontSize: 12, marginTop: 6 }}>
                    {a.solucio ? 'Editar solució' : 'Afegir solució'}
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
