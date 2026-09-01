import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, requireEncarregat, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

// Llista tasques: un treballador només veu les seves, l'encarregat les veu totes
router.get('/', async (req: AuthRequest, res) => {
  const filtre = req.usuari!.rol === 'TREBALLADOR' ? { assignatAId: req.usuari!.id } : {};
  const tasques = await prisma.tasca.findMany({
    where: filtre,
    include: { assignatA: true, creatPer: true },
    orderBy: { creatEl: 'desc' },
  });
  res.json(tasques);
});

// Crear tasca (només encarregats)
router.post('/', requireEncarregat, async (req: AuthRequest, res) => {
  const { titol, descripcio, assignatAId, dataLimit, prioritat } = req.body;
  const tasca = await prisma.tasca.create({
    data: { titol, descripcio, assignatAId, creatPerId: req.usuari!.id, dataLimit, prioritat },
  });
  res.status(201).json(tasca);
});

// Canviar estat d'una tasca (el treballador assignat o un encarregat)
router.patch('/:id/estat', async (req: AuthRequest, res) => {
  const { estat } = req.body;
  const tasca = await prisma.tasca.findUnique({ where: { id: req.params.id } });
  if (!tasca) return res.status(404).json({ error: 'Tasca no trobada' });
  if (req.usuari!.rol === 'TREBALLADOR' && tasca.assignatAId !== req.usuari!.id) {
    return res.status(403).json({ error: 'No pots modificar una tasca que no és teva' });
  }
  const actualitzada = await prisma.tasca.update({ where: { id: req.params.id }, data: { estat } });
  res.json(actualitzada);
});

export default router;
