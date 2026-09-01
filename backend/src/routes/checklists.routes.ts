import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, requireEncarregat, AuthRequest } from '../middleware/auth.middleware';
import { esUsuariElRetenActual } from '../services/reten.service';

const router = Router();
router.use(requireAuth);

const includeAssignatA = { items: true, assignatA: { select: { id: true, nom: true } } };

router.get('/', async (req: AuthRequest, res) => {
  let filtre = {};
  if (req.usuari!.rol === 'TREBALLADOR') {
    const esReten = await esUsuariElRetenActual(req.usuari!.id);
    filtre = {
      OR: [
        { assignatAId: req.usuari!.id },
        ...(esReten ? [{ assignatAlReten: true }] : []),
      ],
    };
  }
  const checklists = await prisma.checklist.findMany({
    where: filtre,
    include: includeAssignatA,
    orderBy: { data: 'desc' },
  });
  res.json(checklists);
});

// Crear checklist amb els seus ítems (només encarregats) — assignada a un usuari i/o al reté
router.post('/', requireEncarregat, async (req: AuthRequest, res) => {
  const { nom, assignatAId, assignatAlReten, frequencia, items, data } = req.body; // items: string[]
  if (!assignatAId && !assignatAlReten) {
    return res.status(400).json({ error: "Cal assignar la checklist a algú o al reté" });
  }
  const checklist = await prisma.checklist.create({
    data: {
      nom,
      assignatAId: assignatAId || null,
      assignatAlReten: !!assignatAlReten,
      frequencia,
      data: data ? new Date(data) : undefined,
      items: {
        create: items.map((text: string, index: number) => ({ text, ordre: index })),
      },
    },
    include: includeAssignatA,
  });
  res.status(201).json(checklist);
});

// Editar dades bàsiques d'una checklist (només encarregats)
router.patch('/:id', requireEncarregat, async (req, res) => {
  const { nom, assignatAId, assignatAlReten, frequencia, data } = req.body;
  if (assignatAId === null && assignatAlReten === false) {
    return res.status(400).json({ error: "Cal assignar la checklist a algú o al reté" });
  }
  const checklist = await prisma.checklist.update({
    where: { id: req.params.id },
    data: {
      nom,
      assignatAId: assignatAId === undefined ? undefined : assignatAId || null,
      assignatAlReten,
      frequencia,
      data: data ? new Date(data) : undefined,
    },
    include: includeAssignatA,
  });
  res.json(checklist);
});

// Eliminar una checklist (només encarregats)
router.delete('/:id', requireEncarregat, async (req, res) => {
  await prisma.checklistItem.deleteMany({ where: { checklistId: req.params.id } });
  await prisma.checklist.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// Marcar/desmarcar un ítem
router.patch('/items/:itemId', async (req: AuthRequest, res) => {
  const { marcat } = req.body;
  const item = await prisma.checklistItem.update({
    where: { id: req.params.itemId },
    data: { marcat },
  });
  res.json(item);
});

export default router;
