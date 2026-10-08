import { z } from 'zod';

export const diaSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => {
  const d = new Date(`${s}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}, 'La data no és vàlida');
export const campSchema = z.object({
  nom: z.string().trim().min(1).max(120),
  tipus: z.enum(['text', 'numero', 'seleccio', 'data', 'multilinia']),
  obligatori: z.boolean().default(true),
  // Camp que només un encarregat pot emplenar o canviar; la resta d'usuaris el veuen bloquejat.
  nomesEncarregat: z.boolean().default(false),
  opcions: z.array(z.string().trim().min(1).max(120)).max(30).optional(),
}).refine(c => c.tipus !== 'seleccio' || (c.opcions && c.opcions.length > 0), 'Afegeix opcions a la selecció');
// Personalització del PDF d'un formulari o control setmanal concret. Tots els camps són
// opcionals: si no es defineixen, el PDF fa servir els valors de "ConfigPdf" (compartits).
// Una cadena buida ("") a pdfColorPrimari/pdfPeuText/pdfInfoAddicional esborra la personalització.
export const pdfPersonalitzatSchema = z.object({
  pdfLogoBase64: z.string().min(4).max(2_000_000).regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/).optional(),
  pdfLogoNomFitxer: z.string().min(1).max(200).optional(),
  pdfTreureLogo: z.boolean().optional(),
  pdfColorPrimari: z.union([z.string().trim().regex(/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/, 'Color no vàlid (format #rrggbb)'), z.literal('')]).optional(),
  pdfPeuText: z.string().trim().max(300).optional(),
  // Text fix que es mostra al PDF (p.ex. número de sèrie de l'analitzador, model de l'equip...).
  pdfInfoAddicional: z.string().trim().max(1000).optional(),
});
export type PdfPersonalitzat = z.infer<typeof pdfPersonalitzatSchema>;

const mimesLogoAdmesos: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg' };
export function validarLogoPdf(base64?: string, nomFitxer?: string): { pdfLogoDades: Buffer; pdfLogoMime: string } | undefined {
  if (!base64 || !nomFitxer) return undefined;
  const ext = nomFitxer.split('.').pop()?.toLowerCase() || '';
  const mime = mimesLogoAdmesos[ext];
  if (!mime) throw new Error('El logo ha de ser PNG o JPG.');
  const bytes = Buffer.from(base64, 'base64');
  if (!bytes.length || bytes.length > 1.5 * 1024 * 1024) throw new Error('El logo ha de pesar com a màxim 1,5 MB.');
  const signaturaValida = ext === 'png' ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (!signaturaValida) throw new Error('El contingut no correspon al format del fitxer.');
  return { pdfLogoDades: bytes, pdfLogoMime: mime };
}

export const plantillaSchema = z.object({
  nom: z.string().trim().min(1).max(180),
  camps: z.array(campSchema).min(1).max(40).refine(c => new Set(c.map(x => x.nom.toLowerCase())).size === c.length, 'Els noms dels camps han de ser diferents'),
}).extend(pdfPersonalitzatSchema.shape);
export type CampControl = z.infer<typeof campSchema>;
export const registreSchema = z.object({
  id: z.string().uuid(), plantillaId: z.string().uuid(), versio: z.number().int().positive(),
  dia: diaSchema, valors: z.record(z.string().max(5000)),
  rectificaId: z.string().uuid().optional(), motiu: z.string().trim().min(1).max(1000).optional(),
});

export function validarValors(
  camps: CampControl[],
  valors: Record<string, string>,
  ctx: { esEncarregat: boolean; valorsOriginals?: Record<string, string> }
) {
  if (Object.keys(valors).some(k => !camps.some(c => c.nom === k))) throw new Error('El formulari conté camps desconeguts');
  const resultat: Record<string, string> = Object.create(null);
  for (const c of camps) {
    // Un usuari que no és encarregat no pot posar ni canviar el valor d'un camp "només encarregat":
    // es conserva el valor que ja hi havia (si n'hi havia) i no es pot exigir com a obligatori.
    if (c.nomesEncarregat && !ctx.esEncarregat) {
      resultat[c.nom] = (ctx.valorsOriginals?.[c.nom] || '').trim();
      continue;
    }
    const v = (valors[c.nom] || '').trim();
    if (c.obligatori && !v) throw new Error(`Falta el camp: ${c.nom}`);
    if (v && c.tipus === 'numero' && (!/^-?\d+(\.\d+)?$/.test(v) || !Number.isFinite(Number(v)))) throw new Error(`Número no vàlid: ${c.nom}`);
    if (v && c.tipus === 'data' && !diaSchema.safeParse(v).success) throw new Error(`Data no vàlida: ${c.nom}`);
    if (v && c.tipus === 'seleccio' && !c.opcions?.includes(v)) throw new Error(`Opció no vàlida: ${c.nom}`);
    resultat[c.nom] = v;
  }
  return resultat;
}
