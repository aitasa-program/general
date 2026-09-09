import { z } from 'zod';
import { diaSchema } from './control.validation';

export interface CampSetmanal { key: string; label: string; tipus: 'text' | 'numero' | 'hora' | 'seleccio'; opcions?: string[] }
export interface ModelSetmanal { id: string; nom: string; titol: string; instruccions: string; grups: { nom: string; camps: CampSetmanal[] }[]; organoleptics: CampSetmanal[]; notaOrg: string; notaAnomalies: string }
const num = (key: string, label: string): CampSetmanal => ({ key, label, tipus: 'numero' });
const select = (key: string, label: string, opcions: string[]): CampSetmanal => ({ key, label, tipus: 'seleccio', opcions });
const color = select('color', 'Color', ['Incolor', 'Colora']);
const sentits = [color, select('olor', 'Olor', ['Inolor', 'Olora']), select('sabor', 'Sabor', ['Insípida', 'Sabora'])];
const notes = { key: 'observacions', label: 'Observacions', tipus: 'text' } as CampSetmanal;
const notaXarxa = 'S’anotaran els valors que indiquin els diferents analitzadors a la següent taula, i es comprovaran amb l’equip portàtil com a mínim dos cops per setmana, anotant també el seu valor. El valor de clor residual a la xarxa es mantindrà entre 0,3 i 0,95 mg/l, sense superar mai 1 mg/l.';
const notaOrg = 'Cal fer exàmens organolèptics mínim 2 cops per setmana. Color: incolora, lleuger color o molt acolorida. Olor: inodora, lleuger olor o forta olor. Sabor: insípida, lleuger sabor o fort sabor. Terbolesa: s’ha de realitzar amb kit. pH: s’ha de realitzar amb kit, 4,5–10.';
const notaAnomalies = 'Si la diferència entre l’analitzador automàtic i el portàtil (manual) és superior a 0,1 ppm, ajustar l’equip.';
const grup = (key: string, nom: string) => ({ nom, camps: [{ key: key + '_hora', label: 'Hora', tipus: 'hora' } as CampSetmanal, num(key + '_auto', 'Auto (mg/l)'), num(key + '_manual', 'Manual (mg/l)')] });
export const modelsSetmanals: ModelSetmanal[] = [
  { id: 'xarxa-clorada', nom: 'Xarxa Clorada', titol: 'XARXA CLORADA', instruccions: notaXarxa,
    grups: [grup('diposit', 'Sortida Dipòsit'), grup('repsol', 'Repsol Tanques'), grup('basf', 'BASF PTP'), grup('clariant', 'CLARIANT')],
    organoleptics: [...sentits, num('terbolesa_auto', 'Terbolesa Auto (UNF)'), num('terbolesa_manual', 'Terbolesa Manual (UNF)'), num('ph_auto', 'pH Auto'), num('ph_manual', 'pH Manual'), notes], notaOrg, notaAnomalies },
  { id: 'clor-tc8', nom: 'Clor TC8', titol: 'Sortida TC · TC-8 A', instruccions: 'S’anotaran els valors i es comprovaran amb l’analitzador portàtil com a mínim dos cops a la setmana. El valor de clor residual a la sortida de la TC-8 ha de ser, com a màxim, de 0,2 mg/l. Si se supera aquest límit, caldrà avisar immediatament la persona responsable.',
    grups: [{ nom: 'TC-8 A', camps: [{ key: 'hora', label: 'Hora', tipus: 'hora' }, num('valor', 'Valor (mg/l)'), notes] }],
    organoleptics: [color, { key: 'terbolesa', label: 'Terbolesa', tipus: 'text' }, num('ph', 'pH'), notes],
    notaOrg: 'Cal fer exàmens organolèptics mínim 2 cops per setmana. Color: incolora, lleuger color o molt acolorida. Terbolesa: neta, lleugerament tèrbola o molt tèrbola. pH: s’ha de realitzar amb kit, 4,5–10.', notaAnomalies: '' },
  { id: 'dupont', nom: 'Dupont', titol: 'XARXA CLORADA · DUPONT', instruccions: notaXarxa,
    grups: [{ ...grup('dupont', 'Dupont'), camps: [...grup('dupont', 'Dupont').camps, num('polsos', 'Pulsos/hora')] }],
    organoleptics: [...sentits, num('terbolesa', 'Terbolesa (UNF)'), num('ph', 'pH'), notes], notaOrg, notaAnomalies },
];

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
      if (!lectures && model.id === 'xarxa-clorada' && f.lloc !== 'Sortida Dipòsit') {
        for (const key of ['ph_auto','terbolesa_auto']) {
          if (valors[key] && (old?.valors[key] !== valors[key] || old.lloc !== f.lloc || old.dia !== f.dia)) throw new Error('El pH i la terbolesa automàtics només corresponen a Sortida Dipòsit');
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
