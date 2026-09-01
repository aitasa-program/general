import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

// Cada usuari veu els seus propis recordatoris; l'encarregat pot crear-ne per a altres
router.get('/', async (req: AuthRequest, res) => {
  const recordatoris = await prisma.recordatori.findMany({
    where: { usuariId: req.usuari!.id },
    orderBy: { dataHora: 'asc' },
  });
  res.json(recordatoris);
});

router.post('/', async (req: AuthRequest, res) => {
  const { text, usuariId, dataHora, repeticio } = req.body;
  // Un treballador només pot crear recordatoris per a ell mateix
  const destinatari = req.usuari!.rol === 'TREBALLADOR' ? req.usuari!.id : (usuariId || req.usuari!.id);
  const recordatori = await prisma.recordatori.create({
    data: { text, usuariId: destinatari, dataHora, repeticio },
  });
  res.status(201).json(recordatori);
});

router.delete('/:id', async (req: AuthRequest, res) => {
  await prisma.recordatori.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
