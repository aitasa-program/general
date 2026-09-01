import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, requireEncarregat, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

// Llista tasques: un treballador només veu les que té assignades, l'encarregat les veu totes
router.get('/', async (req: AuthRequest, res) => {
  const filtre = req.usuari!.rol === 'TREBALLADOR' ? { assignatsA: { some: { id: req.usuari!.id } } } : {};
  const tasques = await prisma.tasca.findMany({
    where: filtre,
    include: { assignatsA: true, creatPer: true },
    orderBy: { creatEl: 'desc' },
  });
  res.json(tasques);
});

// Crear tasca (només encarregats) — es pot assignar a un o més usuaris alhora
router.post('/', requireEncarregat, async (req: AuthRequest, res) => {
  const { titol, descripcio, assignatsAIds, dataLimit, prioritat } = req.body;
  if (!Array.isArray(assignatsAIds) || assignatsAIds.length === 0) {
    return res.status(400).json({ error: 'Cal assignar la tasca a almenys un usuari' });
  }
  const tasca = await prisma.tasca.create({
    data: {
      titol,
      descripcio,
      assignatsA: { connect: assignatsAIds.map((id: string) => ({ id })) },
      creatPerId: req.usuari!.id,
      dataLimit,
      prioritat,
    },
    include: { assignatsA: true, creatPer: true },
  });
  res.status(201).json(tasca);
});

// Canviar estat d'una tasca (un dels treballadors assignats o un encarregat)
router.patch('/:id/estat', async (req: AuthRequest, res) => {
  const { estat } = req.body;
  const tasca = await prisma.tasca.findUnique({ where: { id: req.params.id }, include: { assignatsA: true } });
  if (!tasca) return res.status(404).json({ error: 'Tasca no trobada' });
  const esAssignat = tasca.assignatsA.some((u) => u.id === req.usuari!.id);
  if (req.usuari!.rol === 'TREBALLADOR' && !esAssignat) {
    return res.status(403).json({ error: 'No pots modificar una tasca que no és teva' });
  }
  const actualitzada = await prisma.tasca.update({
    where: { id: req.params.id },
    data: { estat },
    include: { assignatsA: true, creatPer: true },
  });
  res.json(actualitzada);
});

export default router;
