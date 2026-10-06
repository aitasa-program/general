import { prisma } from '../prisma';
import { enviarNotificacio } from './push.service';
import { inicioSetmana } from './setmana.util';

function inicioDelDia(d: Date): Date {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

// Determina qui era el responsable d'una checklist en el cicle que està tancant-se
// (l'assignat directe, o qui tocava de retén/quinzena/quinzena B aquella setmana).
async function resoldreResponsable(c: {
  assignatA: { id: string; nom: string } | null;
  assignatAlReten: boolean;
  assignatAQuinzena: boolean;
  assignatAQuinzenaB: boolean;
  data: Date;
}): Promise<{ id: string; nom: string } | null> {
  if (c.assignatA) return c.assignatA;
  const inici = inicioSetmana(c.data);
  if (c.assignatAlReten) {
    const r = await prisma.reten.findUnique({ where: { setmanaInici: inici }, select: { usuari: { select: { id: true, nom: true } } } });
    if (r) return r.usuari;
  }
  if (c.assignatAQuinzena) {
    const q = await prisma.quinzena.findUnique({ where: { setmanaInici: inici }, select: { usuari: { select: { id: true, nom: true } } } });
    if (q) return q.usuari;
  }
  if (c.assignatAQuinzenaB) {
    const qb = await prisma.quinzenaB.findUnique({ where: { setmanaInici: inici }, select: { usuari: { select: { id: true, nom: true } } } });
    if (qb) return qb.usuari;
  }
  return null;
}

// Revisa checklists DIARIA/SETMANAL: si la seva data ja ha passat, abans de res
// n'arxiva una còpia (items i qui la tenia assignada) a ChecklistHistoric perquè
// no es perdi el que s'ha fet, i després l'avança (dia a dia o setmana a setmana)
// fins avui i reinicia els ítems sense marcar, perquè tornin a aparèixer fresques
// al dia que toca.
async function revisarChecklistsRecurrents() {
  const avui = inicioDelDia(new Date());
  const recurrents = await prisma.checklist.findMany({
    where: { frequencia: { in: ['DIARIA', 'SETMANAL'] }, data: { lt: avui } },
    include: { items: true, assignatA: { select: { id: true, nom: true } } },
  });

  for (const c of recurrents) {
    const responsable = await resoldreResponsable(c);

    const salt = c.frequencia === 'DIARIA' ? 1 : 7;
    const novaData = new Date(c.data);
    while (inicioDelDia(novaData).getTime() < avui.getTime()) {
      novaData.setDate(novaData.getDate() + salt);
    }

    await prisma.$transaction([
      prisma.checklistHistoric.create({
        data: {
          checklistId: c.id,
          nom: c.nom,
          data: c.data,
          assignatAlReten: c.assignatAlReten,
          assignatAQuinzena: c.assignatAQuinzena,
          assignatAQuinzenaB: c.assignatAQuinzenaB,
          responsableId: responsable?.id || null,
          responsableNom: responsable?.nom || null,
          items: c.items.map((i) => ({ text: i.text, marcat: i.marcat, ordre: i.ordre })),
        },
      }),
      prisma.checklist.update({ where: { id: c.id }, data: { data: novaData } }),
      prisma.checklistItem.updateMany({ where: { checklistId: c.id }, data: { marcat: false } }),
    ]);
  }
}

// Revisa tasques DIARIA/SETMANAL amb data límit passada: només avança les que ja
// s'han fet (estat FETA), deixant-les nou cop pendents per al cicle següent.
// Si encara no s'han fet, es queden tal qual al seu dia (endarrerides), perquè
// no desapareguin de la seva data ni "saltin" a la setmana vinent sense fer-se.
async function revisarTasquesRecurrents() {
  const avui = inicioDelDia(new Date());
  const recurrents = await prisma.tasca.findMany({
    where: { repeticio: { in: ['DIARIA', 'SETMANAL'] }, dataLimit: { lt: avui }, estat: 'FETA' },
  });

  for (const t of recurrents) {
    if (!t.dataLimit) continue;
    const salt = t.repeticio === 'DIARIA' ? 1 : 7;
    const novaData = new Date(t.dataLimit);
    while (inicioDelDia(novaData).getTime() < avui.getTime()) {
      novaData.setDate(novaData.getDate() + salt);
    }
    await prisma.tasca.update({
      where: { id: t.id },
      data: { dataLimit: novaData, estat: 'PENDENT' },
    });
  }
}

// Revisa cada minut si hi ha recordatoris que ja han arribat a la seva hora
// i encara no s'han enviat, i els notifica per push al dispositiu de l'usuari.
// Aprofita el mateix cicle per fer avançar checklists i tasques recurrents.
export function iniciarPlanificadorRecordatoris() {
  setInterval(async () => {
    const ara = new Date();
    const pendents = await prisma.recordatori.findMany({
      where: { enviat: false, dataHora: { lte: ara } },
    });

    for (const rec of pendents) {
      await enviarNotificacio(rec.usuariId, 'Recordatori AITASA', rec.text);

      if (rec.repeticio === 'UNIC') {
        await prisma.recordatori.update({ where: { id: rec.id }, data: { enviat: true } });
      } else {
        // Recordatoris diaris/setmanals: es marquen com enviats i es reprograma la següent ocurrència
        const seguentData = new Date(rec.dataHora);
        if (rec.repeticio === 'DIARI') seguentData.setDate(seguentData.getDate() + 1);
        if (rec.repeticio === 'SETMANAL') seguentData.setDate(seguentData.getDate() + 7);
        await prisma.recordatori.update({
          where: { id: rec.id },
          data: { dataHora: seguentData, enviat: false },
        });
      }
    }

    await revisarChecklistsRecurrents();
    await revisarTasquesRecurrents();
  }, 60 * 1000); // cada minut
}
