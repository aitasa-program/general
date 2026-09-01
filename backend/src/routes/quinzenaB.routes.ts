import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, requireEncarregat, AuthRequest } from '../middleware/auth.middleware';
import { inicioSetmanaQuinzenaB } from '../services/quinzenaB.service';

const router = Router();
router.use(requireAuth);

// Quinzena B d'aquesta setmana (accessible a tots els usuaris, per mostrar al Dashboard)
router.get('/actual', async (_req, res) => {
  const inici = inicioSetmanaQuinzenaB(new Date());
  const quinzenaB = await prisma.quinzenaB.findUnique({
    where: { setmanaInici: inici },
    select: { usuari: { select: { id: true, nom: true } } },
  });
  res.json({ setmanaInici: inici, usuari: quinzenaB?.usuari || null });
});

// Llista totes les assignacions de quinzena B (només encarregats)
router.get('/', requireEncarregat, async (_req, res) => {
  const quinzenesB = await prisma.quinzenaB.findMany({
    select: { id: true, setmanaInici: true, usuari: { select: { id: true, nom: true } } },
    orderBy: { setmanaInici: 'asc' },
  });
  res.json(quinzenesB);
});

// Assignar (o reassignar) la quinzena B per la setmana a la qual pertany la data indicada
router.post('/', requireEncarregat, async (req: AuthRequest, res) => {
  const { data, usuariId } = req.body;
  if (!data || !usuariId) {
    return res.status(400).json({ error: 'Cal indicar una data i un usuari' });
  }
  const inici = inicioSetmanaQuinzenaB(new Date(data));
  const quinzenaB = await prisma.quinzenaB.upsert({
    where: { setmanaInici: inici },
    update: { usuariId },
    create: { setmanaInici: inici, usuariId },
    select: { id: true, setmanaInici: true, usuari: { select: { id: true, nom: true } } },
  });
  res.status(201).json(quinzenaB);
});

// Eliminar una assignació de quinzena B (només encarregats)
router.delete('/:id', requireEncarregat, async (req, res) => {
  await prisma.quinzenaB.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
