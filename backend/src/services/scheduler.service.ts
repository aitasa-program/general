import { prisma } from '../prisma';
import { enviarNotificacio } from './push.service';

function inicioDelDia(d: Date): Date {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

// Revisa checklists DIARIA/SETMANAL: si la seva data ja ha passat, l'avança
// (dia a dia o setmana a setmana) fins avui i reinicia els ítems sense marcar,
// perquè tornin a aparèixer fresques al dia que toca.
async function revisarChecklistsRecurrents() {
  const avui = inicioDelDia(new Date());
  const recurrents = await prisma.checklist.findMany({
    where: { frequencia: { in: ['DIARIA', 'SETMANAL'] }, data: { lt: avui } },
    include: { items: true },
  });

  for (const c of recurrents) {
    const salt = c.frequencia === 'DIARIA' ? 1 : 7;
    const novaData = new Date(c.data);
    while (inicioDelDia(novaData).getTime() < avui.getTime()) {
      novaData.setDate(novaData.getDate() + salt);
    }
    await prisma.$transaction([
      prisma.checklist.update({ where: { id: c.id }, data: { data: novaData } }),
      prisma.checklistItem.updateMany({ where: { checklistId: c.id }, data: { marcat: false } }),
    ]);
  }
}

// Revisa tasques DIARIA/SETMANAL amb data límit passada: les avança fins avui
// i les torna a deixar pendents, perquè es tornin a fer cada cicle.
async function revisarTasquesRecurrents() {
  const avui = inicioDelDia(new Date());
  const recurrents = await prisma.tasca.findMany({
    where: { repeticio: { in: ['DIARIA', 'SETMANAL'] }, dataLimit: { lt: avui } },
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
