import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, requireEncarregat, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/', async (req: AuthRequest, res) => {
  const filtre = req.usuari!.rol === 'TREBALLADOR' ? { assignatAId: req.usuari!.id } : {};
  const checklists = await prisma.checklist.findMany({
    where: filtre,
    include: { items: true, assignatA: { select: { id: true, nom: true } } },
    orderBy: { data: 'desc' },
  });
  res.json(checklists);
});

// Crear checklist amb els seus ítems (només encarregats)
router.post('/', requireEncarregat, async (req: AuthRequest, res) => {
  const { nom, assignatAId, frequencia, items, data } = req.body; // items: string[]
  const checklist = await prisma.checklist.create({
    data: {
      nom,
      assignatAId,
      frequencia,
      data: data ? new Date(data) : undefined,
      items: {
        create: items.map((text: string, index: number) => ({ text, ordre: index })),
      },
    },
    include: { items: true },
  });
  res.status(201).json(checklist);
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
