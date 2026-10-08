import { useRef } from 'react';
import { PdfPersonalitzatInput, PdfPersonalitzatPublic } from '../services/arxiu';

export interface PdfPersonalitzatState {
  logoBase64?: string; logoNomFitxer?: string; treureLogo: boolean;
  colorPrimari: string; peuText: string; infoAddicional: string;
}

export function pdfPersonalitzatBuit(): PdfPersonalitzatState {
  return { treureLogo: false, colorPrimari: '', peuText: '', infoAddicional: '' };
}

export function pdfPersonalitzatDes(p: PdfPersonalitzatPublic): PdfPersonalitzatState {
  return { treureLogo: false, colorPrimari: p.pdfColorPrimari, peuText: p.pdfPeuText, infoAddicional: p.pdfInfoAddicional };
}

export function pdfPersonalitzatPayload(s: PdfPersonalitzatState): PdfPersonalitzatInput {
  return {
    ...(s.logoBase64 && s.logoNomFitxer ? { pdfLogoBase64: s.logoBase64, pdfLogoNomFitxer: s.logoNomFitxer } : {}),
    ...(s.treureLogo ? { pdfTreureLogo: true } : {}),
    pdfColorPrimari: s.colorPrimari, pdfPeuText: s.peuText, pdfInfoAddicional: s.infoAddicional,
  };
}

function llegirComABase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Lectura del fitxer fallida'));
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.readAsDataURL(file);
  });
}

// Bloc reutilitzable de personalització del PDF (logo, color, peu de pàgina i informació
// addicional com números de sèrie), incrustat directament a l'editor de cada formulari o
// control setmanal: no cal una pantalla de "Configuració del PDF" separada.
export default function PersonalitzacioPdf({ value, onChange, tePdfLogoActual, disabled }: {
  value: PdfPersonalitzatState;
  onChange: (v: PdfPersonalitzatState) => void;
  tePdfLogoActual: boolean;
  disabled?: boolean;
}) {
  const fileInput = useRef<HTMLInputElement>(null);

  async function triarLogo(fitxers: FileList | null) {
    const file = fitxers?.[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      if (fileInput.current) fileInput.current.value = '';
      return;
    }
    const logoBase64 = await llegirComABase64(file);
    onChange({ ...value, logoBase64, logoNomFitxer: file.name, treureLogo: false });
  }

  return (
    <fieldset className="field-editor">
      <legend>Personalització del PDF d'aquest formulari (opcional)</legend>
      <p className="text-muted" style={{ fontSize: 12 }}>Si no s'omple, es fa servir la configuració general (logo i color per defecte).</p>

      <label>Logo propi (PNG o JPG, màxim 1,5 MB)
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
          <span className="text-muted" style={{ fontSize: 12 }}>
            {value.logoNomFitxer
              ? `Nou logo seleccionat: ${value.logoNomFitxer}`
              : value.treureLogo
              ? 'Es traurà el logo propi en desar'
              : tePdfLogoActual
              ? 'Logo propi configurat'
              : 'Sense logo propi (es fa servir el general)'}
          </span>
          {tePdfLogoActual && !value.treureLogo && !value.logoNomFitxer && (
            <button type="button" disabled={disabled} onClick={() => onChange({ ...value, logoBase64: undefined, logoNomFitxer: undefined, treureLogo: true })} style={{ fontSize: 12 }}>
              Treure logo
            </button>
          )}
        </div>
        <input ref={fileInput} type="file" accept=".png,.jpg,.jpeg" disabled={disabled} onChange={(e) => triarLogo(e.target.files)} />
      </label>

      <label style={{ marginTop: 10, display: 'block' }}>Color principal (deixa en blanc per fer servir el per defecte)
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
          <input type="color" value={value.colorPrimari || '#0066D6'} onChange={(e) => onChange({ ...value, colorPrimari: e.target.value })} disabled={disabled} />
          <input value={value.colorPrimari} onChange={(e) => onChange({ ...value, colorPrimari: e.target.value })} disabled={disabled} maxLength={7} placeholder="Per defecte" style={{ width: 110 }} />
        </div>
      </label>

      <label style={{ marginTop: 10, display: 'block' }}>Text de peu de pàgina (deixa en blanc per fer servir el per defecte)
        <input value={value.peuText} onChange={(e) => onChange({ ...value, peuText: e.target.value })} disabled={disabled} maxLength={300} style={{ width: '100%' }} />
      </label>

      <label style={{ marginTop: 10, display: 'block' }}>Informació addicional al PDF (p.ex. número de sèrie de l'analitzador, model de l'equip...)
        <textarea value={value.infoAddicional} onChange={(e) => onChange({ ...value, infoAddicional: e.target.value })} disabled={disabled} rows={2} maxLength={1000} style={{ width: '100%' }} />
      </label>
    </fieldset>
  );
}
