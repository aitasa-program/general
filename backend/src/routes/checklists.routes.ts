import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, requireEncarregat, AuthRequest } from '../middleware/auth.middleware';
import { inicioSetmana } from '../services/setmana.util';

const router = Router();
router.use(requireAuth);

const includeAssignatA = { items: true, assignatA: { select: { id: true, nom: true } } };

type UsuariMinim = { id: string; nom: string };

// Retorna, per a cada setmana (dilluns 8:00), qui hi és assignat de reté / quinzena.
// Es fa servir per resoldre "qui toca" segons la data pròpia de cada checklist,
// en lloc de fer servir sempre el reté/quinzena d'avui.
async function mapaPerSetmana(taula: 'reten' | 'quinzena'): Promise<Map<number, UsuariMinim>> {
  const files =
    taula === 'reten'
      ? await prisma.reten.findMany({ select: { setmanaInici: true, usuari: { select: { id: true, nom: true } } } })
      : await prisma.quinzena.findMany({ select: { setmanaInici: true, usuari: { select: { id: true, nom: true } } } });
  return new Map(files.map((f) => [f.setmanaInici.getTime(), f.usuari]));
}

router.get('/', async (req: AuthRequest, res) => {
  const [totes, mapaReten, mapaQuinzena] = await Promise.all([
    prisma.checklist.findMany({ include: includeAssignatA, orderBy: { data: 'desc' } }),
    mapaPerSetmana('reten'),
    mapaPerSetmana('quinzena'),
  ]);

  const enriquides = totes.map((c) => ({
    ...c,
    retenResolt: c.assignatAlReten ? mapaReten.get(inicioSetmana(c.data).getTime()) || null : null,
    quinzenaResolt: c.assignatAQuinzena ? mapaQuinzena.get(inicioSetmana(c.data).getTime()) || null : null,
  }));

  if (req.usuari!.rol === 'ENCARREGAT') {
    return res.json(enriquides);
  }

  const meves = enriquides.filter(
    (c) =>
      c.assignatAId === req.usuari!.id ||
      (c.assignatAlReten && c.retenResolt?.id === req.usuari!.id) ||
      (c.assignatAQuinzena && c.quinzenaResolt?.id === req.usuari!.id)
  );
  res.json(meves);
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
