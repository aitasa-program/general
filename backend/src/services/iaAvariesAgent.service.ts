import { GoogleGenAI, Part } from '@google/genai';

export function iaAvariesConfigurada(): boolean {
  return !!process.env.IA_GEMINI_API_KEY;
}

function client(): GoogleGenAI {
  const apiKey = process.env.IA_GEMINI_API_KEY;
  if (!apiKey) throw new Error("Falta la variable d'entorn IA_GEMINI_API_KEY");
  return new GoogleGenAI({ apiKey });
}

const SISTEMA = `Ets un assistent de diagnòstic d'avaries per a AITASA (planta de tractament d'aigües: xarxa de clorat, comunicacions, equips de mesura...).

Se't donaran, com a context, casos d'avaries anteriors ja resolts: cadascun amb una foto, la descripció del problema i com es va arreglar. Després se't donarà un cas NOU (foto i, opcionalment, una descripció dels símptomes) que cal diagnosticar.

La teva feina:
1. Compara la foto i la descripció del cas nou amb els casos anteriors: busca semblances visuals (mateix quadre elèctric, mateix equip, mateixa caseta, mateix tipus d'avaria...) i de símptomes.
2. Si trobes un cas anterior clarament semblant, digues-ho explícitament ("S'assembla al cas d'X") i proposa la mateixa solució o una d'adaptada.
3. Si no hi ha cap cas anterior prou semblant, digues-ho amb honestedat i dona la teva millor hipòtesi igualment, a partir del que es veu a la foto.
4. Sigues breu, directe i pràctic: què és probablement l'avaria i què hauria de revisar o fer la persona ara mateix. Respon sempre en català.
5. Si la foto no mostra prou informació per diagnosticar res, digues-ho i demana què es necessitaria veure.`;

export interface CasAnterior { problema: string; solucio: string; fotoMime: string | null; fotoBase64: string | null }

export async function diagnosticarAvaria(
  problemaNou: string,
  fotoMimeNova: string,
  fotoBase64Nova: string,
  casosAnteriors: CasAnterior[]
): Promise<string> {
  const model = process.env.IA_AVARIES_MODEL || 'gemini-2.5-flash';
  const ai = client();
  const parts: Part[] = [];

  if (casosAnteriors.length) {
    parts.push({ text: `Hi ha ${casosAnteriors.length} casos anteriors resolts com a referència:` });
    casosAnteriors.forEach((c, i) => {
      parts.push({ text: `\nCas anterior #${i + 1}\nProblema: ${c.problema}\nSolució aplicada: ${c.solucio}` });
      if (c.fotoMime && c.fotoBase64) parts.push({ inlineData: { mimeType: c.fotoMime, data: c.fotoBase64 } });
    });
  } else {
    parts.push({ text: 'Encara no hi ha cap cas anterior registrat. Dona la millor hipòtesi a partir només de la foto i la descripció.' });
  }

  parts.push({ text: `\nCas NOU a diagnosticar.\nDescripció donada per l'usuari: ${problemaNou || '(cap descripció, només la foto)'}` });
  parts.push({ inlineData: { mimeType: fotoMimeNova, data: fotoBase64Nova } });

  const resposta = await ai.models.generateContent({
    model,
    contents: [{ role: 'user', parts }],
    config: { systemInstruction: SISTEMA },
  });

  const text = resposta.text;
  if (!text) throw new Error('La IA no ha retornat cap resposta.');
  return text;
}
