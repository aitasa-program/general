import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, requireEncarregat, AuthRequest } from '../middleware/auth.middleware';
import { esUsuariElRetenActual } from '../services/reten.service';
import { esUsuariLaQuinzenaActual } from '../services/quinzena.service';

const router = Router();
router.use(requireAuth);

const includeAssignatA = { items: true, assignatA: { select: { id: true, nom: true } } };

router.get('/', async (req: AuthRequest, res) => {
  let filtre = {};
  if (req.usuari!.rol === 'TREBALLADOR') {
    const [esReten, esQuinzena] = await Promise.all([
      esUsuariElRetenActual(req.usuari!.id),
      esUsuariLaQuinzenaActual(req.usuari!.id),
    ]);
    filtre = {
      OR: [
        { assignatAId: req.usuari!.id },
        ...(esReten ? [{ assignatAlReten: true }] : []),
        ...(esQuinzena ? [{ assignatAQuinzena: true }] : []),
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
  const { nom, assignatAId, assignatAlReten, assignatAQuinzena, frequencia, items, data } = req.body; // items: string[]
  if (!assignatAId && !assignatAlReten && !assignatAQuinzena) {
    return res.status(400).json({ error: "Cal assignar la checklist a algú, al reté o a la quinzena" });
  }
  const checklist = await prisma.checklist.create({
    data: {
      nom,
      assignatAId: assignatAId || null,
      assignatAlReten: !!assignatAlReten,
      assignatAQuinzena: !!assignatAQuinzena,
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
  const { nom, assignatAId, assignatAlReten, assignatAQuinzena, frequencia, data } = req.body;
  if (assignatAId === null && assignatAlReten === false && assignatAQuinzena === false) {
    return res.status(400).json({ error: "Cal assignar la checklist a algú, al reté o a la quinzena" });
  }
  const checklist = await prisma.checklist.update({
    where: { id: req.params.id },
    data: {
      nom,
      assignatAId: assignatAId === undefined ? undefined : assignatAId || null,
      assignatAlReten,
      assignatAQuinzena,
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

// Afegir un ítem nou a una checklist existent (només encarregats)
router.post('/:id/items', requireEncarregat, async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Cal indicar el text de l\'ítem' });
  const maxOrdre = await prisma.checklistItem.aggregate({
    where: { checklistId: req.params.id },
    _max: { ordre: true },
  });
  const item = await prisma.checklistItem.create({
    data: { checklistId: req.params.id, text, ordre: (maxOrdre._max.ordre ?? -1) + 1 },
  });
  res.status(201).json(item);
});

// Marcar/desmarcar un ítem, o (només encarregats) editar-ne el text
router.patch('/items/:itemId', async (req: AuthRequest, res) => {
  const { marcat, text } = req.body;
  if (text !== undefined && req.usuari!.rol !== 'ENCARREGAT') {
    return res.status(403).json({ error: 'Només un encarregat pot editar el text' });
  }
  const item = await prisma.checklistItem.update({
    where: { id: req.params.itemId },
    data: { marcat, text },
  });
  res.json(item);
});

// Eliminar un ítem (només encarregats)
router.delete('/items/:itemId', requireEncarregat, async (req, res) => {
  await prisma.checklistItem.delete({ where: { id: req.params.itemId } });
  res.status(204).send();
});

export default router;
