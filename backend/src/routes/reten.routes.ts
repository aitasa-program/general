import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, requireEncarregat, AuthRequest } from '../middleware/auth.middleware';
import { inicioSetmanaReten } from '../services/reten.service';

const router = Router();
router.use(requireAuth);

// Reté d'aquesta setmana (accessible a tots els usuaris, per mostrar al Dashboard)
router.get('/actual', async (_req, res) => {
  const inici = inicioSetmanaReten(new Date());
  const reten = await prisma.reten.findUnique({
    where: { setmanaInici: inici },
    select: { usuari: { select: { id: true, nom: true } } },
  });
  res.json({ setmanaInici: inici, usuari: reten?.usuari || null });
});

// Llista totes les assignacions de reté (només encarregats)
router.get('/', requireEncarregat, async (_req, res) => {
  const retens = await prisma.reten.findMany({
    select: { id: true, setmanaInici: true, usuari: { select: { id: true, nom: true } } },
    orderBy: { setmanaInici: 'asc' },
  });
  res.json(retens);
});

// Assignar (o reassignar) el reté per la setmana a la qual pertany la data indicada
router.post('/', requireEncarregat, async (req: AuthRequest, res) => {
  const { data, usuariId } = req.body;
  if (!data || !usuariId) {
    return res.status(400).json({ error: 'Cal indicar una data i un usuari' });
  }
  const inici = inicioSetmanaReten(new Date(data));
  const reten = await prisma.reten.upsert({
    where: { setmanaInici: inici },
    update: { usuariId },
    create: { setmanaInici: inici, usuariId },
    select: { id: true, setmanaInici: true, usuari: { select: { id: true, nom: true } } },
  });
  res.status(201).json(reten);
});

// Eliminar una assignació de reté (només encarregats)
router.delete('/:id', requireEncarregat, async (req, res) => {
  await prisma.reten.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
