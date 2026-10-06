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
export const plantillaSchema = z.object({
  nom: z.string().trim().min(1).max(180),
  camps: z.array(campSchema).min(1).max(40).refine(c => new Set(c.map(x => x.nom.toLowerCase())).size === c.length, 'Els noms dels camps han de ser diferents'),
});
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
