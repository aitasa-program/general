import { useEffect, useState } from 'react';
import { getUsuariActual } from '../services/api';
import {
  CampFormulari,
  Formulari,
  RespostaFormulari,
  crearFormulari,
  enviarResposta,
  llistarFormularis,
  llistarRespostes,
} from '../services/formularis';
import BotoTornar from '../components/BotoTornar';

const etiquetaTipus: Record<string, string> = {
  text: 'Text',
  numero: 'Número',
  seleccio: 'Selecció',
};

export default function Formularis() {
  const usuariActual = getUsuariActual();
  const esEncarregat = usuariActual?.rol === 'ENCARREGAT';

  const [formularis, setFormularis] = useState<Formulari[]>([]);
  const [carregant, setCarregant] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const [mostrarNouFormulari, setMostrarNouFormulari] = useState(false);
  const [nom, setNom] = useState('');
  const [campsText, setCampsText] = useState('');

  const [formulariObert, setFormulariObert] = useState<string | null>(null);
  const [valors, setValors] = useState<Record<string, string>>({});

  const [respostesObertes, setRespostesObertes] = useState<string | null>(null);
  const [respostes, setRespostes] = useState<RespostaFormulari[]>([]);

  async function carregar() {
    setCarregant(true);
    try {
      const dades = await llistarFormularis();
      setFormularis(dades);
    } catch {
      setError("No s'han pogut carregar els formularis");
    } finally {
      setCarregant(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function parsejarCamps(text: string): CampFormulari[] {
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
    const camps = parsejarCamps(campsText);
    if (camps.length === 0) {
      setError('Afegeix almenys un camp al formulari');
      return;
    }
    try {
      await crearFormulari(nom, camps);
      setNom('');
      setCampsText('');
      setMostrarNouFormulari(false);
      carregar();
    } catch {
      setError("No s'ha pogut crear el formulari");
    }
  }

  function obrirFormulari(f: Formulari) {
    setFormulariObert(f.id);
    setValors({});
    setOk('');
    setError('');
  }

  async function handleEnviarResposta(e: React.FormEvent, formulariId: string) {
    e.preventDefault();
    setError('');
    try {
      await enviarResposta(formulariId, valors);
      setOk('Resposta enviada correctament');
      setFormulariObert(null);
      setValors({});
    } catch {
      setError("No s'ha pogut enviar la resposta");
    }
  }

  async function obrirRespostes(formulariId: string) {
    setRespostesObertes(formulariId);
    try {
      const dades = await llistarRespostes(formulariId);
      setRespostes(dades);
    } catch {
      setError("No s'han pogut carregar les respostes");
    }
  }

  if (carregant) return <p className="page text-muted">Carregant formularis...</p>;

  return (
    <div className="page">
      <BotoTornar />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Formularis</h1>
        {esEncarregat && (
          <button onClick={() => setMostrarNouFormulari(!mostrarNouFormulari)}>
            {mostrarNouFormulari ? 'Cancel·lar' : '+ Nou formulari'}
          </button>
        )}
      </div>

      {error && <p className="text-error">{error}</p>}
      {ok && <p className="text-success">{ok}</p>}

      {mostrarNouFormulari && (
        <form onSubmit={handleCrearFormulari} className="card" style={{ marginBottom: 20, maxWidth: 480 }}>
          <div style={{ marginBottom: 10 }}>
            <label>Nom del formulari</label>
            <input value={nom} onChange={(e) => setNom(e.target.value)} required style={{ width: '100%' }} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label>Camps (un per línia: nom | tipus | opcions)</label>
            <textarea
              value={campsText}
              onChange={(e) => setCampsText(e.target.value)}
              rows={5}
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

      {formularis.length === 0 && <p className="text-muted">No hi ha formularis per mostrar.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {formularis.map((f) => (
          <div key={f.id} className="card" style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <strong>{f.nom}</strong>
              <span className="text-muted" style={{ fontSize: 12 }}>{f.camps.length} camps</span>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button onClick={() => obrirFormulari(f)}>
                {formulariObert === f.id ? 'Tancar' : 'Omplir'}
              </button>
              {esEncarregat && (
                <button onClick={() => obrirRespostes(f.id === respostesObertes ? '' : f.id)}>
                  {respostesObertes === f.id ? 'Amagar respostes' : 'Veure respostes'}
                </button>
              )}
            </div>

            {formulariObert === f.id && (
              <form onSubmit={(e) => handleEnviarResposta(e, f.id)} style={{ marginTop: 12, borderTop: '1px solid #eee', paddingTop: 12 }}>
                {f.camps.map((camp) => (
                  <div key={camp.nom} style={{ marginBottom: 10 }}>
                    <label>{camp.nom}</label>
                    {camp.tipus === 'seleccio' ? (
                      <select
                        value={valors[camp.nom] || ''}
                        onChange={(e) => setValors({ ...valors, [camp.nom]: e.target.value })}
                        required
                        style={{ width: '100%' }}
                      >
                        <option value="">Selecciona...</option>
                        {(camp.opcions || []).map((op) => (
                          <option key={op} value={op}>
                            {op}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={camp.tipus === 'numero' ? 'number' : 'text'}
                        value={valors[camp.nom] || ''}
                        onChange={(e) => setValors({ ...valors, [camp.nom]: e.target.value })}
                        required
                        style={{ width: '100%' }}
                      />
                    )}
                  </div>
                ))}
                <button type="submit">Enviar resposta</button>
              </form>
            )}

            {respostesObertes === f.id && (
              <div style={{ marginTop: 12, borderTop: '1px solid #eee', paddingTop: 12 }}>
                {respostes.length === 0 ? (
                  <p className="text-muted" style={{ fontSize: 13 }}>Encara no hi ha respostes.</p>
                ) : (
                  respostes.map((r) => (
                    <div key={r.id} style={{ fontSize: 13, marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #f0f0f0' }}>
                      <strong>{r.usuari.nom}</strong> · {new Date(r.dataEl).toLocaleString()}
                      <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                        {Object.entries(r.valors).map(([k, v]) => (
                          <li key={k}>
                            {k}: {v}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
