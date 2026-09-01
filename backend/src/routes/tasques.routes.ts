import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, requireEncarregat, AuthRequest } from '../middleware/auth.middleware';
import { esUsuariElRetenActual } from '../services/reten.service';
import { esUsuariLaQuinzenaActual } from '../services/quinzena.service';

const router = Router();
router.use(requireAuth);

const includeUsuaris = {
  assignatsA: { select: { id: true, nom: true } },
  creatPer: { select: { id: true, nom: true } },
};

// Llista tasques: un treballador veu les que té assignades i les del reté/quinzena (si ho és ell)
router.get('/', async (req: AuthRequest, res) => {
  let filtre = {};
  if (req.usuari!.rol === 'TREBALLADOR') {
    const [esReten, esQuinzena] = await Promise.all([
      esUsuariElRetenActual(req.usuari!.id),
      esUsuariLaQuinzenaActual(req.usuari!.id),
    ]);
    filtre = {
      OR: [
        { assignatsA: { some: { id: req.usuari!.id } } },
        ...(esReten ? [{ assignatAlReten: true }] : []),
        ...(esQuinzena ? [{ assignatAQuinzena: true }] : []),
      ],
    };
  }
  const tasques = await prisma.tasca.findMany({
    where: filtre,
    include: includeUsuaris,
    orderBy: { creatEl: 'desc' },
  });
  res.json(tasques);
});

// Crear tasca (només encarregats) — es pot assignar a un o més usuaris, i/o al reté/quinzena
router.post('/', requireEncarregat, async (req: AuthRequest, res) => {
  const { titol, descripcio, assignatsAIds, assignatAlReten, assignatAQuinzena, dataLimit, prioritat, repeticio } = req.body;
  const ids: string[] = Array.isArray(assignatsAIds) ? assignatsAIds : [];
  if (ids.length === 0 && !assignatAlReten && !assignatAQuinzena) {
    return res.status(400).json({ error: 'Cal assignar la tasca a algú, al reté o a la quinzena' });
  }
  const tasca = await prisma.tasca.create({
    data: {
      titol,
      descripcio,
      assignatsA: { connect: ids.map((id) => ({ id })) },
      assignatAlReten: !!assignatAlReten,
      assignatAQuinzena: !!assignatAQuinzena,
      creatPerId: req.usuari!.id,
      dataLimit,
      prioritat,
      repeticio: repeticio || 'UNIC',
    },
    include: includeUsuaris,
  });
  res.status(201).json(tasca);
});

// Canviar estat d'una tasca (un dels assignats, el reté/quinzena si li pertoca, o un encarregat)
router.patch('/:id/estat', async (req: AuthRequest, res) => {
  const { estat } = req.body;
  const tasca = await prisma.tasca.findUnique({
    where: { id: req.params.id },
    include: { assignatsA: { select: { id: true } } },
  });
  if (!tasca) return res.status(404).json({ error: 'Tasca no trobada' });
  const esAssignat = tasca.assignatsA.some((u) => u.id === req.usuari!.id);
  const potPerReten = tasca.assignatAlReten && (await esUsuariElRetenActual(req.usuari!.id));
  const potPerQuinzena = tasca.assignatAQuinzena && (await esUsuariLaQuinzenaActual(req.usuari!.id));
  if (req.usuari!.rol === 'TREBALLADOR' && !esAssignat && !potPerReten && !potPerQuinzena) {
    return res.status(403).json({ error: 'No pots modificar una tasca que no és teva' });
  }
  const actualitzada = await prisma.tasca.update({
    where: { id: req.params.id },
    data: { estat },
    include: includeUsuaris,
  });
  res.json(actualitzada);
});

export default router;
