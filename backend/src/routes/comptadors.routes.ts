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
  const { nom, zonaId, tipusAigua } = req.body;
  if (!nom || !zonaId) return res.status(400).json({ error: 'Cal indicar un nom i una zona' });
  const comptador = await prisma.comptador.create({
    data: { nom, zonaId, tipusAigua: tipusAigua || '' },
    include: { zona: true },
  });
  res.status(201).json(comptador);
});

router.patch('/:id', requireEncarregat, async (req, res) => {
  const { nom, zonaId, tipusAigua } = req.body;
  if (!nom || !zonaId) return res.status(400).json({ error: 'Cal indicar un nom i una zona' });
  try {
    const comptador = await prisma.comptador.update({
      where: { id: req.params.id },
      data: { nom, zonaId, tipusAigua: tipusAigua || '' },
      include: { zona: true },
    });
    res.json(comptador);
  } catch {
    res.status(404).json({ error: 'Comptador no trobat' });
  }
});

// Només un encarregat pot marcar/desmarcar un comptador com a llegit.
router.patch('/:id/estat', requireEncarregat, async (req, res) => {
  const { llegit } = req.body;
  if (typeof llegit !== 'boolean') return res.status(400).json({ error: 'Cal indicar si està llegit' });
  try {
    const comptador = await prisma.comptador.update({
      where: { id: req.params.id },
      data: { llegit, llegitEl: llegit ? new Date() : null },
      include: { zona: true },
    });
    res.json(comptador);
  } catch {
    res.status(404).json({ error: 'Comptador no trobat' });
  }
});

router.delete('/:id', requireEncarregat, async (req, res) => {
  await prisma.comptador.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
