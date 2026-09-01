import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware';
import { clauPublicaVapid, enviarNotificacio } from '../services/push.service';

const router = Router();

// Clau pública VAPID: el frontend la necessita per subscriure's (no cal estar loguejat per llegir-la)
router.get('/clau-publica', (_req, res) => {
  res.json({ clauPublica: clauPublicaVapid() });
});

router.use(requireAuth);

// El navegador envia aquí la subscripció generada pel Push Manager
router.post('/subscriure', async (req: AuthRequest, res) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'Subscripció incompleta' });
  }
  await prisma.subscripcioPush.upsert({
    where: { endpoint },
    update: { p256dh: keys.p256dh, auth: keys.auth, usuariId: req.usuari!.id },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, usuariId: req.usuari!.id },
  });
  res.status(201).json({ ok: true });
});

router.post('/desubscriure', async (req: AuthRequest, res) => {
  const { endpoint } = req.body;
  await prisma.subscripcioPush.deleteMany({ where: { endpoint, usuariId: req.usuari!.id } });
  res.json({ ok: true });
});

// Notificació de prova, per confirmar que tot funciona un cop instal·lat
router.post('/prova', async (req: AuthRequest, res) => {
  await enviarNotificacio(req.usuari!.id, 'AITASA', 'Notificacions activades correctament.');
  res.json({ ok: true });
});

export default router;
