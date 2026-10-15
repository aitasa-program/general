import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { requireAuth, requireEncarregat } from '../middleware/auth.middleware';
import { endpoint, compteActiu } from './arxiu.utils';

const router = Router();
router.use(requireAuth, compteActiu);

// Nom personalitzat de cada capa del mapa. L'id de la capa ve fixat pel fitxer
// frontend/src/data/mapaAitasa.ts; aquí només es guarda l'alternativa, si n'hi ha.
router.get('/capes', endpoint(async (_req, res) => {
  const capes = await prisma.capaMapa.findMany();
  res.json(capes);
}));

const nomSchema = z.object({ nom: z.string().trim().min(1).max(120) });
router.patch('/capes/:id', requireEncarregat, endpoint(async (req, res) => {
  const { nom } = nomSchema.parse(req.body);
  const id = req.params.id;
  if (!id || id.length > 60) return res.status(400).json({ error: 'Capa no vàlida' });
  const capa = await prisma.capaMapa.upsert({ where: { id }, create: { id, nom }, update: { nom } });
  res.json(capa);
}));

export default router;
