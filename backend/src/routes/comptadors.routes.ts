import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, requireEncarregat } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

// --- Zones (empreses / àrees on hi ha comptadors) ---

router.get('/zones', async (_req, res) => {
  const zones = await prisma.zonaComptador.findMany({ orderBy: { nom: 'asc' } });
  res.json(zones);
});

router.post('/zones', requireEncarregat, async (req, res) => {
  const { nom } = req.body;
  if (!nom) return res.status(400).json({ error: 'Cal indicar un nom per la zona' });
  try {
    const zona = await prisma.zonaComptador.create({ data: { nom } });
    res.status(201).json(zona);
  } catch {
    res.status(400).json({ error: "No s'ha pogut crear la zona (potser ja existeix)" });
  }
});

// --- Comptadors ---

router.get('/', async (_req, res) => {
  const comptadors = await prisma.comptador.findMany({
    include: { zona: true },
    orderBy: { nom: 'asc' },
  });
  res.json(comptadors);
});

router.post('/', requireEncarregat, async (req, res) => {
  const { nom, zonaId } = req.body;
  if (!nom || !zonaId) return res.status(400).json({ error: 'Cal indicar un nom i una zona' });
  const comptador = await prisma.comptador.create({
    data: { nom, zonaId },
    include: { zona: true },
  });
  res.status(201).json(comptador);
});

router.delete('/:id', requireEncarregat, async (req, res) => {
  await prisma.comptador.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
