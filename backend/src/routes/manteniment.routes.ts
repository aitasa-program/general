import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { requireAuth, requireEncarregat } from '../middleware/auth.middleware';
import { compteActiu, endpoint } from './arxiu.utils';

// El pla de manteniment només el veuen els encarregats: els treballadors no hi tenen
// cap tasca assignada individualment, així que no els cal veure'l.
const router = Router();
router.use(requireAuth, compteActiu, requireEncarregat);

const includeRegistres = { registres: { orderBy: { dataFet: 'desc' as const }, take: 1, include: { usuari: { select: { id: true, nom: true } } } } };

router.get('/', endpoint(async (_req, res) => {
  const equips = await prisma.equipManteniment.findMany({
    orderBy: { ordre: 'asc' },
    include: includeRegistres,
  });
  res.json(equips.map(e => ({ ...e, ultimFet: e.registres[0] || null, registres: undefined })));
}));

const schema = z.object({
  zona: z.string().trim().min(1).max(200),
  part: z.string().trim().min(1).max(300),
  reg: z.string().trim().max(40).default(''),
  intern: z.boolean().default(false),
  extern: z.boolean().default(false),
  periodicitatText: z.string().trim().min(1).max(300),
  periodicitatDies: z.number().int().min(1).max(3650).nullable().default(null),
  mesExecucio: z.number().int().min(1).max(12).nullable().default(null),
  properaData: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes: z.string().max(2000).default(''),
  actiu: z.boolean().default(true),
});

router.post('/', endpoint(async (req, res) => {
  const data = schema.parse(req.body);
  const ultim = await prisma.equipManteniment.aggregate({ _max: { ordre: true } });
  const creat = await prisma.equipManteniment.create({
    data: { ...data, ordre: (ultim._max.ordre || 0) + 1, properaData: data.properaData ? new Date(data.properaData) : null },
    include: includeRegistres,
  });
  res.status(201).json({ ...creat, ultimFet: null, registres: undefined });
}));

router.patch('/:id', endpoint(async (req, res) => {
  const data = schema.partial().parse(req.body);
  const existent = await prisma.equipManteniment.findUnique({ where: { id: req.params.id } });
  if (!existent) return res.status(404).json({ error: 'Equip no trobat' });
  const actualitzat = await prisma.equipManteniment.update({
    where: { id: req.params.id },
    data: { ...data, ...(data.properaData !== undefined ? { properaData: data.properaData ? new Date(data.properaData) : null } : {}) },
    include: includeRegistres,
  });
  res.json({ ...actualitzat, ultimFet: actualitzat.registres[0] || null, registres: undefined });
}));

router.delete('/:id', endpoint(async (req, res) => {
  if (!await prisma.equipManteniment.findUnique({ where: { id: req.params.id } })) return res.status(404).json({ error: 'Equip no trobat' });
  await prisma.equipManteniment.delete({ where: { id: req.params.id } });
  res.status(204).send();
}));

// Marca un equip com a fet avui. Avança la propera data segons la periodicitat, si en té.
router.post('/:id/fet', endpoint(async (req, res) => {
  const { notes } = z.object({ notes: z.string().max(1000).default('') }).parse(req.body);
  const equip = await prisma.equipManteniment.findUnique({ where: { id: req.params.id } });
  if (!equip) return res.status(404).json({ error: 'Equip no trobat' });
  const ara = new Date();
  let properaData = equip.properaData;
  if (equip.periodicitatDies) {
    properaData = new Date(ara.getTime() + equip.periodicitatDies * 24 * 60 * 60 * 1000);
  } else if (equip.mesExecucio) {
    const any = ara.getUTCMonth() + 1 >= equip.mesExecucio ? ara.getUTCFullYear() + 1 : ara.getUTCFullYear();
    properaData = new Date(Date.UTC(any, equip.mesExecucio - 1, 15));
  }
  const [registre] = await prisma.$transaction([
    prisma.registreManteniment.create({ data: { equipId: equip.id, usuariId: req.usuari!.id, notes }, include: { usuari: { select: { id: true, nom: true } } } }),
    prisma.equipManteniment.update({ where: { id: equip.id }, data: { properaData } }),
  ]);
  res.status(201).json({ registre, properaData });
}));

export default router;
