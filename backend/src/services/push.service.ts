import webpush from 'web-push';
import { prisma } from '../prisma';

// Claus VAPID: identifiquen el servidor davant dels navegadors.
// Es generen UNA VEGADA amb `npx web-push generate-vapid-keys` i es guarden a .env.
// Mai s'han de canviar un cop l'app està en ús, o les subscripcions existents deixaran de funcionar.
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails('mailto:suport@aitasa.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export function clauPublicaVapid() {
  return VAPID_PUBLIC_KEY;
}

// Envia una notificació push a tots els dispositius subscrits d'un usuari.
// Si alguna subscripció ha caducat (l'usuari va desinstal·lar o revocar permisos),
// s'elimina automàticament de la base de dades.
export async function enviarNotificacio(usuariId: string, titol: string, cos: string) {
  const subscripcions = await prisma.subscripcioPush.findMany({ where: { usuariId } });

  for (const sub of subscripcions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify({ title: titol, body: cos })
      );
    } catch (error: any) {
      if (error.statusCode === 404 || error.statusCode === 410) {
        await prisma.subscripcioPush.delete({ where: { id: sub.id } });
      }
    }
  }
}
