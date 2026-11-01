import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';

const categories = [
  { tipus: 'XARXA_INDUSTRIAL', nom: 'Xarxa industrial', origen: 'XARXA_INDUSTRIAL' },
  { tipus: 'XARXA_REGENERADA', nom: 'Xarxa regenerada', origen: 'XARXA_REGENERADA' },
  { tipus: 'XARXA_CLORADA', nom: 'Xarxa clorada', origen: 'XARXA_CLORADA' },
  { tipus: 'TRACTAMENT_CONJUNT', nom: 'Tractament conjunt', origen: 'TRACTAMENT_CONJUNT' },
  { tipus: 'SENSE_CLASSIFICAR', nom: 'Pendents de classificar', origen: 'SENSE_CLASSIFICAR' },
] as const;

function classificar(nom: string): typeof categories[number]['tipus'][] {
  const upper = nom.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  const tipus: typeof categories[number]['tipus'][] = [];
  if (/(^|\b)XR\b/.test(upper)) tipus.push('XARXA_REGENERADA');
  if (/(^|\b)XI\b/.test(upper)) tipus.push('XARXA_INDUSTRIAL');
  if (/(^|\b)XC\b/.test(upper)) tipus.push('XARXA_CLORADA');
  if (/(^|\b)TC\b/.test(upper)) tipus.push('TRACTAMENT_CONJUNT');
  return tipus.length ? tipus : ['SENSE_CLASSIFICAR'];
}

function normalitzar(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function clauPunt(capaId: string, punt: { nom: string; descripcio: string | null; lat: number; lon: number }, tipus: string, duplicat: number): string {
  const base = [capaId, punt.lat.toFixed(6), punt.lon.toFixed(6), tipus, duplicat].join('|');
  return `mapa-comptadors:${createHash('sha256').update(base).digest('hex')}`;
}

export async function sincronitzarChecklistDesDelMapa(tx: Prisma.TransactionClient) {
  const capes = await tx.capaMapa.findMany({ include: { punts: { orderBy: { nom: 'asc' } } } });
  const capa = capes.find((c) => c.id === 'comptadors') || capes.find((c) => normalitzar(c.nom).includes('comptador')) ||
    [...capes].sort((a, b) => b.punts.filter((p) => classificar(p.nom)[0] !== 'SENSE_CLASSIFICAR').length - a.punts.filter((p) => classificar(p.nom)[0] !== 'SENSE_CLASSIFICAR').length)
      .find((c) => c.punts.some((p) => classificar(p.nom)[0] !== 'SENSE_CLASSIFICAR'));
  const punts = capa?.punts || [];

  const checklists = await Promise.all(categories.map((categoria) => tx.checklist.upsert({
    where: { origenComptadors: categoria.origen },
    create: {
      nom: `Comptadors · ${categoria.nom}`,
      origenComptadors: categoria.origen,
      assignatAlReten: false,
      frequencia: 'PUNTUAL',
    },
    update: {
      nom: `Comptadors · ${categoria.nom}`,
      assignatAlReten: false,
      assignatAQuinzena: false,
      assignatAQuinzenaB: false,
      frequencia: 'PUNTUAL',
    },
  })));
  const checklistPerTipus = new Map(categories.map((categoria, index) => [categoria.tipus, checklists[index]]));
  const idsChecklists = checklists.map((c) => c.id);
  const existents = await tx.checklistItem.findMany({ where: { checklistId: { in: idsChecklists } } });
  const perClau = new Map(existents.filter((i) => i.origenComptadorKey).map((i) => [i.origenComptadorKey!, i]));
  const utilitzats = new Set<string>();
  const totals: Record<string, number> = Object.fromEntries(categories.map((c) => [c.tipus, 0]));
  const duplicats = new Map<string, number>();

  for (const punt of punts) {
    const basePunt = [punt.lat.toFixed(6), punt.lon.toFixed(6)].join('|');
    const ordinalDuplicat = duplicats.get(basePunt) || 0;
    duplicats.set(basePunt, ordinalDuplicat + 1);
    for (const tipus of classificar(punt.nom)) {
      const checklist = checklistPerTipus.get(tipus)!;
      const ordre = totals[tipus];
      const key = clauPunt(capa?.id || 'comptadors', punt, tipus, ordinalDuplicat);
      let item = perClau.get(key);
      if (!item) {
        const nomNet = normalitzar(punt.nom);
        item = existents.find((i) => !utilitzats.has(i.id) && !i.origenComptadorKey &&
          (normalitzar(i.text) === nomNet || normalitzar(i.text.split(' · ').at(-1) || '') === nomNet));
      }
      if (item) {
        const actualitzat = await tx.checklistItem.update({
          where: { id: item.id },
          data: { checklistId: checklist.id, text: punt.nom, ordre, comptadorId: null, origenComptadorKey: key },
        });
        utilitzats.add(item.id);
        perClau.set(key, actualitzat);
      } else {
        const nou = await tx.checklistItem.create({
          data: { checklistId: checklist.id, text: punt.nom, ordre, origenComptadorKey: key },
        });
        utilitzats.add(nou.id);
        perClau.set(key, nou);
      }
      totals[tipus]++;
    }
  }

  const obsolets = existents.filter((i) => !utilitzats.has(i.id)).map((i) => i.id);
  if (obsolets.length) await tx.checklistItem.deleteMany({ where: { id: { in: obsolets } } });
  const senseClassificar = totals.SENSE_CLASSIFICAR;
  const totalPunts = punts.length;
  return { totals, totalPunts, senseClassificar };
}
