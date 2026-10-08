import { z } from 'zod';
import { diaSchema, pdfPersonalitzatSchema } from './control.validation';

export interface CampSetmanal { key: string; label: string; tipus: 'text' | 'numero' | 'hora' | 'seleccio'; opcions?: string[] }
export interface GrupSetmanal { nom: string; camps: CampSetmanal[] }
export interface ModelSetmanal {
  id: string; nom: string; titol: string; instruccions: string;
  llocs: string[]; grups: GrupSetmanal[]; organoleptics: CampSetmanal[];
  notaOrg: string; notaAnomalies: string; bespoke: boolean; activa: boolean;
  pdfLogoDades?: Buffer | Uint8Array | null; pdfLogoMime?: string | null;
  pdfColorPrimari?: string | null; pdfPeuText?: string | null; pdfInfoAddicional?: string | null;
}

// Validació dels camps que un encarregat pot definir des de l'editor de
// "Gestionar controls setmanals" (crear un control nou o editar-ne un ja fet).
export const campSetmanalSchema = z.object({
  key: z.string().trim().min(1).max(60).regex(/^[a-z0-9_]+$/, "La clau només pot tenir lletres minúscules, números i guions baixos"),
  label: z.string().trim().min(1).max(120),
  tipus: z.enum(['text', 'numero', 'hora', 'seleccio']),
  opcions: z.array(z.string().trim().min(1).max(120)).max(30).optional(),
}).refine(c => c.tipus !== 'seleccio' || (c.opcions && c.opcions.length > 0), 'Afegeix opcions a la selecció');
export const grupSetmanalSchema = z.object({
  nom: z.string().trim().min(1).max(120),
  camps: z.array(campSetmanalSchema).min(1).max(20).refine(c => new Set(c.map(x => x.key)).size === c.length, 'Les claus dels camps dins d’un grup han de ser diferents'),
});
export const modelSetmanalInputSchema = z.object({
  nom: z.string().trim().min(1).max(120),
  titol: z.string().trim().min(1).max(160),
  instruccions: z.string().trim().max(2000).default(''),
  llocs: z.array(z.string().trim().min(1).max(120)).min(1).max(12).refine(l => new Set(l).size === l.length, 'Els llocs han de ser diferents'),
  grups: z.array(grupSetmanalSchema).min(1).max(8).refine(g => new Set(g.map(x => x.nom)).size === g.length, 'Els noms dels grups han de ser diferents'),
  // Si és true, les lectures de pH/terbolesa "automàtiques" només es poden omplir pel primer lloc de la llista
  // (com la Xarxa Clorada, on només "Sortida Dipòsit" té analitzador automàtic). Si és false, cada lloc
  // registra un únic valor de pH i terbolesa (amb kit manual), com Dupont o Repsol Deslastres.
  autoPerLloc: z.boolean().default(false),
  notaOrg: z.string().trim().max(2000).default(''),
  notaAnomalies: z.string().trim().max(2000).default(''),
}).extend(pdfPersonalitzatSchema.shape);
export type ModelSetmanalInput = z.infer<typeof modelSetmanalInputSchema>;

const notesCamp: CampSetmanal = { key: 'observacions', label: 'Observacions', tipus: 'text' };
const colorCamp: CampSetmanal = { key: 'color', label: 'Color', tipus: 'seleccio', opcions: ['Incolor', 'Colora'] };
const olorCamp: CampSetmanal = { key: 'olor', label: 'Olor', tipus: 'seleccio', opcions: ['Inolor', 'Olora'] };
const saborCamp: CampSetmanal = { key: 'sabor', label: 'Sabor', tipus: 'seleccio', opcions: ['Insípida', 'Sabora'] };

// Construeix les lectures organolèptiques (color/olor/sabor + terbolesa/pH) a partir de les
// opcions de l'editor; el PDF de controls setmanals espera exactament aquestes claus.
export function construirOrganoleptics(autoPerLloc: boolean): CampSetmanal[] {
  return autoPerLloc
    ? [colorCamp, olorCamp, saborCamp, { key: 'terbolesa_auto', label: 'Terbolesa Auto (UNF)', tipus: 'numero' }, { key: 'terbolesa_manual', label: 'Terbolesa Manual (UNF)', tipus: 'numero' }, { key: 'ph_auto', label: 'pH Auto', tipus: 'numero' }, { key: 'ph_manual', label: 'pH Manual', tipus: 'numero' }, notesCamp]
    : [colorCamp, olorCamp, saborCamp, { key: 'terbolesa', label: 'Terbolesa (UNF)', tipus: 'numero' }, { key: 'ph', label: 'pH', tipus: 'numero' }, notesCamp];
}

export function dilluns(dia: string) {
  const d = new Date(diaSchema.parse(dia) + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7);
  return d.toISOString().slice(0, 10);
}
export function diesSetmana(setmana: string) {
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(setmana + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + i); return d.toISOString().slice(0, 10); });
}
const filaSchema = z.object({ id: z.string().min(1).max(60), dia: diaSchema, lloc: z.string().max(120).default(''), valors: z.record(z.string().max(1000)), operari: z.string().max(200).optional() });
export const dadesSetmanalsSchema = z.object({ lectures: z.array(filaSchema).length(7), organoleptics: z.array(filaSchema).max(60), anomalies: z.string().max(5000), observacions: z.string().max(5000), operaris: z.array(z.string()).optional() });
export type DadesSetmanals = z.infer<typeof dadesSetmanalsSchema>;
export type FilaSetmanal = DadesSetmanals['lectures'][number];
export function dadesBuides(setmana: string): DadesSetmanals {
  return { lectures: diesSetmana(setmana).map(dia => ({ id: dia, dia, lloc: '', valors: {} })), organoleptics: [], anomalies: '', observacions: '', operaris: [] };
}

// Validate against the photographed model; never discard out-of-range readings.
export function prepararSetmana(model: ModelSetmanal, setmana: string, raw: unknown, anterior: DadesSetmanals, autor: string) {
  const dades = dadesSetmanalsSchema.parse(raw);
  const dies = diesSetmana(setmana);
  // Si el model té lectures "automàtiques" (p.ex. pH/terbolesa auto), només es permeten al primer lloc de la llista.
  const autoPerLloc = model.organoleptics.some(c => c.key.endsWith('_auto'));
  let correccio = false;
  function files(files: FilaSetmanal[], originals: FilaSetmanal[], camps: CampSetmanal[], lectures: boolean) {
    if (new Set(files.map(f => f.id)).size !== files.length) throw new Error('Hi ha files duplicades');
    return files.map((f, i) => {
      if (!dies.includes(f.dia) || (lectures && (f.dia !== dies[i] || f.id !== f.dia))) throw new Error('Les dates han de correspondre a la setmana seleccionada');
      if (Object.keys(f.valors).some(k => !camps.some(c => c.key === k))) throw new Error('Camp desconegut');
      const valors: Record<string, string> = {};
      for (const c of camps) {
        let value = (f.valors[c.key] || '').trim();
        if (c.tipus === 'numero') value = value.replace(',', '.');
        if (value && c.tipus === 'numero' && (!/^-?\d+(\.\d+)?$/.test(value) || !Number.isFinite(Number(value)))) throw new Error(`Revisa el número: ${c.label}`);
        if (value && c.tipus === 'hora' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error('Hora no vàlida');
        if (value && c.tipus === 'seleccio' && !c.opcions?.includes(value)) throw new Error(`Opció no vàlida: ${c.label}`);
        if (value) valors[c.key] = value;
      }
      const old = originals.find(o => o.id === f.id);
      if (!lectures && autoPerLloc && f.lloc !== model.llocs[0]) {
        for (const key of ['ph_auto','terbolesa_auto']) {
          if (valors[key] && (old?.valors[key] !== valors[key] || old.lloc !== f.lloc || old.dia !== f.dia)) throw new Error(`El pH i la terbolesa automàtics només corresponen a ${model.llocs[0]}`);
        }
      }
      if (old && (Object.entries(old.valors).some(([k, v]) => v && v !== valors[k]) || (old.lloc && old.lloc !== f.lloc) || (Object.keys(old.valors).length && old.dia !== f.dia))) correccio = true;
      const same = old && JSON.stringify(old.valors) === JSON.stringify(valors) && old.lloc === f.lloc && old.dia === f.dia;
      return { id: f.id, dia: f.dia, lloc: f.lloc, valors, operari: same ? old.operari || '' : Object.keys(valors).length || f.lloc ? autor : '' };
    });
  }
  if (anterior.organoleptics.some(o => !dades.organoleptics.some(f => f.id === o.id))) correccio = true;
  dades.lectures = files(dades.lectures, anterior.lectures, model.grups.flatMap(g => g.camps), true);
  dades.organoleptics = files(dades.organoleptics, anterior.organoleptics, model.organoleptics, false);
  if (dades.organoleptics.some(f => !f.lloc.trim() || !Object.keys(f.valors).length)) throw new Error('Indica el lloc i almenys un valor de cada control organolèptic');
  if ((anterior.anomalies && anterior.anomalies !== dades.anomalies) || (anterior.observacions && anterior.observacions !== dades.observacions)) correccio = true;
  if (!dades.lectures.some(f => Object.keys(f.valors).length) && !dades.organoleptics.length && !dades.anomalies.trim() && !dades.observacions.trim()) throw new Error('Afegeix almenys una lectura o observació');
  dades.operaris = [...new Set([...(anterior.operaris || []), autor])];
  return { dades, correccio };
}
