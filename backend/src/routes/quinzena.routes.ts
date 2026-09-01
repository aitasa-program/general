import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, requireEncarregat, AuthRequest } from '../middleware/auth.middleware';
import { inicioSetmanaQuinzena } from '../services/quinzena.service';

const router = Router();
router.use(requireAuth);

// Quinzena d'aquesta setmana (accessible a tots els usuaris, per mostrar al Dashboard)
router.get('/actual', async (_req, res) => {
  const inici = inicioSetmanaQuinzena(new Date());
  const quinzena = await prisma.quinzena.findUnique({
    where: { setmanaInici: inici },
    select: { usuari: { select: { id: true, nom: true } } },
  });
  res.json({ setmanaInici: inici, usuari: quinzena?.usuari || null });
});

// Llista totes les assignacions de quinzena (només encarregats)
router.get('/', requireEncarregat, async (_req, res) => {
  const quinzenes = await prisma.quinzena.findMany({
    select: { id: true, setmanaInici: true, usuari: { select: { id: true, nom: true } } },
    orderBy: { setmanaInici: 'asc' },
  });
  res.json(quinzenes);
});

// Assignar (o reassignar) la quinzena per la setmana a la qual pertany la data indicada
router.post('/', requireEncarregat, async (req: AuthRequest, res) => {
  const { data, usuariId } = req.body;
  if (!data || !usuariId) {
    return res.status(400).json({ error: 'Cal indicar una data i un usuari' });
  }
  const inici = inicioSetmanaQuinzena(new Date(data));
  const quinzena = await prisma.quinzena.upsert({
    where: { setmanaInici: inici },
    update: { usuariId },
    create: { setmanaInici: inici, usuariId },
    select: { id: true, setmanaInici: true, usuari: { select: { id: true, nom: true } } },
  });
  res.status(201).json(quinzena);
});

// Eliminar una assignació de quinzena (només encarregats)
router.delete('/:id', requireEncarregat, async (req, res) => {
  await prisma.quinzena.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
