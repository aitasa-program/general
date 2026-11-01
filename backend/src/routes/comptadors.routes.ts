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
  if (!nom || !zonaId || !tipusAigua) return res.status(400).json({ error: 'Cal indicar un nom, una zona i un tipus d’aigua' });
  const tipusValids = ['XARXA_INDUSTRIAL', 'XARXA_REGENERADA', 'XARXA_CLORADA', 'TRACTAMENT_CONJUNT'];
  if (tipusAigua && !tipusValids.includes(tipusAigua)) return res.status(400).json({ error: "El tipus d'aigua no és vàlid" });
  const comptador = await prisma.comptador.create({
    data: { nom, zonaId, tipusAigua: tipusAigua || null },
    include: { zona: true },
  });
  res.status(201).json(comptador);
});

router.patch('/:id', requireEncarregat, async (req, res) => {
  const { tipusAigua } = req.body;
  const tipusValids = ['XARXA_INDUSTRIAL', 'XARXA_REGENERADA', 'XARXA_CLORADA', 'TRACTAMENT_CONJUNT'];
  if (tipusAigua !== null && !tipusValids.includes(tipusAigua)) return res.status(400).json({ error: "El tipus d'aigua no és vàlid" });
  const comptador = await prisma.comptador.update({
    where: { id: req.params.id },
    data: { tipusAigua },
    include: { zona: true },
  });
  res.json(comptador);
});

router.delete('/:id', requireEncarregat, async (req, res) => {
  await prisma.$transaction([
    prisma.checklistItem.deleteMany({ where: { comptadorId: req.params.id } }),
    prisma.comptador.delete({ where: { id: req.params.id } }),
  ]);
  res.status(204).send();
});

export default router;
