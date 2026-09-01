import { prisma } from '../prisma';
import { enviarNotificacio } from './push.service';

// Revisa cada minut si hi ha recordatoris que ja han arribat a la seva hora
// i encara no s'han enviat, i els notifica per push al dispositiu de l'usuari.
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
  }, 60 * 1000); // cada minut
}
