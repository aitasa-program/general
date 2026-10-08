import { FormEvent, useEffect, useRef, useState } from 'react';
import { ConfigPdf, desarConfigPdf, obtenirConfigPdf, obtenirLogoPdfUrl } from '../services/configPdf';
import BotoTornar from '../components/BotoTornar';

function llegirComABase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Lectura del fitxer fallida'));
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.readAsDataURL(file);
  });
}

export default function ConfiguracioPdf() {
  const [config, setConfig] = useState<ConfigPdf | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [color, setColor] = useState('#0066D6');
  const [peuText, setPeuText] = useState('');
  const [nouLogo, setNouLogo] = useState<{ nom: string; base64: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [carregant, setCarregant] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  async function carregar() {
    setCarregant(true);
    try {
      const [c, logo] = await Promise.all([obtenirConfigPdf(), obtenirLogoPdfUrl()]);
      setConfig(c);
      setColor(c.colorPrimari);
      setPeuText(c.peuText);
      setLogoUrl(logo);
    } catch {
      setError("No s'ha pogut carregar la configuració del PDF");
    } finally {
      setCarregant(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function handleTriarLogo(fitxers: FileList | null) {
    const file = fitxers?.[0];
    if (!file) return;
    setError('');
    if (file.size > 1.5 * 1024 * 1024) {
      setError('El logo ha de pesar com a màxim 1,5 MB');
      if (fileInput.current) fileInput.current.value = '';
      return;
    }
    try {
      setNouLogo({ nom: file.name, base64: await llegirComABase64(file) });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleDesar(e: FormEvent) {
    e.preventDefault();
    setError('');
    setOk('');
    setBusy(true);
    try {
      await desarConfigPdf({
        colorPrimari: color,
        peuText,
        ...(nouLogo ? { logoBase64: nouLogo.base64, logoNomFitxer: nouLogo.nom } : {}),
      });
      setNouLogo(null);
      if (fileInput.current) fileInput.current.value = '';
      await carregar();
      setOk('Configuració del PDF desada.');
    } catch {
      setError("No s'ha pogut desar la configuració");
    } finally {
      setBusy(false);
    }
  }

  async function handleTreureLogo() {
    setError('');
    setBusy(true);
    try {
      await desarConfigPdf({ treureLogo: true });
      setNouLogo(null);
      await carregar();
      setOk('Logo eliminat.');
    } catch {
      setError("No s'ha pogut eliminar el logo");
    } finally {
      setBusy(false);
    }
  }

  if (carregant) return <p className="page text-muted">Carregant configuració del PDF...</p>;

  return (
    <div className="page">
      <BotoTornar />
      <h1>Configuració del PDF</h1>
      <p className="text-muted" style={{ fontSize: 13 }}>
        El logo, el color i el peu de pàgina que tries aquí s'apliquen a tots els PDF: els "Registres de control",
        els controls setmanals nous que creïs des de l'editor, i també els 4 originals (Xarxa Clorada, Clor TC8,
        Dupont i Repsol Deslastres), que mantenen l'estructura del full en paper però amb el teu logo i color.
      </p>

      {error && <p className="text-error">{error}</p>}
      {ok && <p className="text-success">{ok}</p>}

      <form onSubmit={handleDesar} className="card" style={{ width: '100%' }}>
        <div style={{ marginBottom: 14 }}>
          <label>Logo actual</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo configurat" style={{ maxHeight: 48, maxWidth: 160 }} />
            ) : (
              <span className="text-muted" style={{ fontSize: 13 }}>Cap logo configurat (es mostra només el títol)</span>
            )}
            {config?.teLogo && (
              <button type="button" disabled={busy} onClick={handleTreureLogo} style={{ fontSize: 12, color: 'var(--c-error)' }}>
                Treure logo
              </button>
            )}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label htmlFor="pdf-logo">Canviar logo (PNG o JPG, màxim 1,5 MB)</label>
          <input ref={fileInput} id="pdf-logo" type="file" accept=".png,.jpg,.jpeg" disabled={busy} onChange={(e) => handleTriarLogo(e.target.files)} />
          {nouLogo && <p className="text-muted" style={{ fontSize: 12 }}>Nou logo seleccionat: {nouLogo.nom} (es desarà en prémer "Desar")</p>}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label htmlFor="pdf-color">Color principal</label>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input id="pdf-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} disabled={busy} />
            <input value={color} onChange={(e) => setColor(e.target.value)} disabled={busy} maxLength={7} style={{ width: 100 }} />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label htmlFor="pdf-peu">Text de peu de pàgina (opcional)</label>
          <input id="pdf-peu" value={peuText} onChange={(e) => setPeuText(e.target.value)} disabled={busy} maxLength={300} placeholder="Ex: AITASA S.L. · Document confidencial" style={{ width: '100%' }} />
        </div>

        <button type="submit" disabled={busy}>{busy ? 'Desant…' : 'Desar configuració'}</button>
      </form>
    </div>
  );
}
