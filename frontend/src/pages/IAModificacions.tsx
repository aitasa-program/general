import { FormEvent, useEffect, useState } from 'react';
import {
  EstatIA,
  PropostaIA,
  aplicarPropostaIA,
  demanarCanviIA,
  errorIA,
  llistarPropostesIA,
  obtenirEstatIA,
  rebutjarPropostaIA,
} from '../services/iaModificacions';
import BotoTornar from '../components/BotoTornar';

const ETIQUETA_ESTAT: Record<PropostaIA['estat'], string> = {
  PENDENT: 'Pendent de revisió',
  APLICADA: 'Aplicada i desplegada',
  REBUTJADA: 'Rebutjada',
  ERROR: 'Error en aplicar-la',
};

export default function IAModificacions() {
  const [estatServei, setEstatServei] = useState<EstatIA | null>(null);
  const [propostes, setPropostes] = useState<PropostaIA[]>([]);
  const [carregant, setCarregant] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [demanant, setDemanant] = useState(false);
  const [resolent, setResolent] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  async function carregar() {
    setCarregant(true);
    try {
      const [est, llista] = await Promise.all([obtenirEstatIA(), llistarPropostesIA()]);
      setEstatServei(est);
      setPropostes(llista);
    } catch (e) {
      setError(errorIA(e));
    } finally {
      setCarregant(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function handleDemanar(e: FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || demanant) return;
    setError('');
    setOk('');
    setDemanant(true);
    try {
      const proposta = await demanarCanviIA(prompt.trim());
      setPropostes((prev) => [proposta, ...prev]);
      setPrompt('');
      setOk('La IA ha preparat una proposta. Revisa-la abans d’aplicar-la.');
    } catch (e) {
      setError(errorIA(e));
    } finally {
      setDemanant(false);
    }
  }

  async function handleAplicar(id: string) {
    setError('');
    setOk('');
    setResolent(id);
    try {
      const actualitzada = await aplicarPropostaIA(id);
      setPropostes((prev) => prev.map((p) => (p.id === id ? actualitzada : p)));
      if (actualitzada.estat === 'APLICADA') setOk('Canvi aplicat i desplegat.');
      else setError(actualitzada.error || "No s'ha pogut aplicar el canvi.");
    } catch (e) {
      setError(errorIA(e));
    } finally {
      setResolent(null);
    }
  }

  async function handleRebutjar(id: string) {
    setError('');
    setResolent(id);
    try {
      const actualitzada = await rebutjarPropostaIA(id);
      setPropostes((prev) => prev.map((p) => (p.id === id ? actualitzada : p)));
    } catch (e) {
      setError(errorIA(e));
    } finally {
      setResolent(null);
    }
  }

  if (carregant) return <p className="page text-muted">Carregant Modificacions APP...</p>;

  const avisConfig = estatServei && (!estatServei.iaConfigurada || !estatServei.repoConfigurat);

  return (
    <div className="page">
      <BotoTornar />
      <h1>Modificacions APP</h1>
      <p className="text-muted" style={{ fontSize: 13 }}>
        Descriu en llenguatge natural el canvi que vols a l'aplicació. Una IA llegirà el codi, prepararà els
        fitxers necessaris i et mostrarà una proposta. Res es desplega fins que premis "Aplicar i desplegar".
      </p>

      {avisConfig && (
        <div className="card card--warning" style={{ marginBottom: 16 }}>
          <strong>Encara falta configuració al servidor</strong>
          <p style={{ fontSize: 13, margin: '4px 0 0' }}>
            {!estatServei!.iaConfigurada && <>Falta la variable IA_GEMINI_API_KEY. </>}
            {!estatServei!.repoConfigurat && <>Falten IA_GITHUB_TOKEN i/o IA_GITHUB_REPO. </>}
            Configura-les a les variables d'entorn del backend (p. ex. a Render) i reinicia el servei.
          </p>
        </div>
      )}

      {error && <p className="text-error">{error}</p>}
      {ok && <p className="text-success">{ok}</p>}

      <form onSubmit={handleDemanar} className="card" style={{ marginBottom: 24, width: '100%' }}>
        <label htmlFor="ia-prompt">Què vols que canviï?</label>
        <textarea
          id="ia-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          placeholder="Ex: Al formulari de pH i manteniment de les casetes, afegeix camps pels patrons de pH 4 i 7..."
          style={{ width: '100%' }}
          required
          disabled={demanant}
        />
        <button type="submit" disabled={demanant || !prompt.trim()} style={{ marginTop: 10 }}>
          {demanant ? 'La IA està preparant la proposta…' : 'Demanar canvi'}
        </button>
      </form>

      <h2 style={{ fontSize: 18 }}>Propostes</h2>
      {propostes.length === 0 ? (
        <p className="text-muted">Encara no s'ha demanat cap canvi.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {propostes.map((p) => (
            <div key={p.id} className="card" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 6 }}>
                <strong>{ETIQUETA_ESTAT[p.estat]}</strong>
                <span className="text-muted" style={{ fontSize: 12 }}>
                  {p.creatPer.nom} · {new Date(p.creatEl).toLocaleString('ca-ES')}
                </span>
              </div>
              <p style={{ margin: '6px 0' }}>{p.resum}</p>
              <p className="text-muted" style={{ fontSize: 12, fontStyle: 'italic' }}>"{p.prompt}"</p>

              <details>
                <summary style={{ fontSize: 13, cursor: 'pointer' }}>
                  {p.fitxers.length} fitxer{p.fitxers.length === 1 ? '' : 's'} afectat{p.fitxers.length === 1 ? '' : 's'} · {p.missatgeCommit}
                </summary>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                  {p.fitxers.map((f) => (
                    <div key={f.path}>
                      <code style={{ fontSize: 12 }}>{f.path}</code>
                      <pre style={{ fontSize: 11, maxHeight: 240, overflow: 'auto', background: 'var(--c-bg-subtle, #f5f5f5)', padding: 8, borderRadius: 6 }}>
                        {f.contingut}
                      </pre>
                    </div>
                  ))}
                </div>
              </details>

              {p.estat === 'PENDENT' && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button disabled={resolent === p.id} onClick={() => handleAplicar(p.id)}>
                    {resolent === p.id ? 'Aplicant…' : 'Aplicar i desplegar'}
                  </button>
                  <button disabled={resolent === p.id} onClick={() => handleRebutjar(p.id)} style={{ color: 'var(--c-error)' }}>
                    Rebutjar
                  </button>
                </div>
              )}
              {p.estat === 'APLICADA' && p.commitSha && (
                <p className="text-muted" style={{ fontSize: 12, marginTop: 8 }}>
                  Commit {p.commitSha.slice(0, 10)} · aplicat per {p.aplicatPer?.nom}
                </p>
              )}
              {p.estat === 'ERROR' && p.error && (
                <p className="text-error" style={{ fontSize: 12, marginTop: 8 }}>
                  {p.error}
                </p>
              )}
              {p.estat === 'REBUTJADA' && (
                <p className="text-muted" style={{ fontSize: 12, marginTop: 8 }}>
                  Rebutjada per {p.aplicatPer?.nom}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
