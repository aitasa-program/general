import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, requireEncarregat, AuthRequest } from '../middleware/auth.middleware';
import { inicioSetmana } from '../services/setmana.util';
import { sincronitzarChecklistDesDelMapa } from '../services/mapaComptadorsChecklist.service';

const router = Router();
router.use(requireAuth);

const includeAssignatA = { items: true, assignatA: { select: { id: true, nom: true } } };

type UsuariMinim = { id: string; nom: string };

// Retorna, per a cada setmana (dilluns 8:00), qui hi és assignat de retén / quinzena / quinzena B.
// Es fa servir per resoldre "qui toca" segons la data pròpia de cada checklist,
// en lloc de fer servir sempre el retén/quinzena d'avui.
async function mapaPerSetmana(taula: 'reten' | 'quinzena' | 'quinzenaB'): Promise<Map<number, UsuariMinim>> {
  const files =
    taula === 'reten'
      ? await prisma.reten.findMany({ select: { setmanaInici: true, usuari: { select: { id: true, nom: true } } } })
      : taula === 'quinzena'
      ? await prisma.quinzena.findMany({ select: { setmanaInici: true, usuari: { select: { id: true, nom: true } } } })
      : await prisma.quinzenaB.findMany({ select: { setmanaInici: true, usuari: { select: { id: true, nom: true } } } });
  return new Map(files.map((f) => [f.setmanaInici.getTime(), f.usuari]));
}

router.get('/', async (req: AuthRequest, res) => {
  const [totes, mapaReten, mapaQuinzena, mapaQuinzenaB] = await Promise.all([
    prisma.checklist.findMany({ where: { origenComptadors: null }, include: includeAssignatA, orderBy: { data: 'desc' } }),
    mapaPerSetmana('reten'),
    mapaPerSetmana('quinzena'),
    mapaPerSetmana('quinzenaB'),
  ]);

  const enriquides = totes.map((c) => {
    const setmana = inicioSetmana(c.data).getTime();
    return {
      ...c,
      // El responsable és sempre qui estava de RETÉN aquella setmana concreta, encara que
      // ja n'hagi passat una altra de retén: així qui no l'ha fet continua veient-ho com a
      // seu pendent, i la resta de companys no veuen l'incompliment d'una setmana que no era seva.
      retenResolt: c.assignatAlReten ? (mapaReten.get(setmana) || null) : null,
      quinzenaResolt: c.assignatAQuinzena ? mapaQuinzena.get(setmana) || null : null,
      quinzenaBResolt: c.assignatAQuinzenaB ? mapaQuinzenaB.get(setmana) || null : null,
    };
  });

  if (req.usuari!.rol === 'ENCARREGAT') {
    return res.json(enriquides);
  }

  const meves = enriquides.filter(
    (c) =>
      c.origenComptadors !== null ||
      c.assignatAId === req.usuari!.id ||
      (c.assignatAlReten && c.retenResolt?.id === req.usuari!.id) ||
      (c.assignatAQuinzena && c.quinzenaResolt?.id === req.usuari!.id) ||
      (c.assignatAQuinzenaB && c.quinzenaBResolt?.id === req.usuari!.id)
  );
  res.json(meves);
});

// Llistes sincronitzades amb el mapa, visibles a la pantalla Comptadors per a tothom.
router.get('/comptadors', async (_req, res) => {
  const checklists = await prisma.checklist.findMany({
    where: { origenComptadors: { in: ['XARXA_INDUSTRIAL', 'XARXA_REGENERADA', 'XARXA_CLORADA', 'TRACTAMENT_CONJUNT', 'SENSE_CLASSIFICAR'] } },
    include: { items: { orderBy: { ordre: 'asc' } } },
  });
  res.json(checklists);
});

// Historial de checklists recurrents ja tancades (setmanes/dies anteriors), perquè
// no es perdi el que s'ha fet quan el planificador les reinicia per al cicle següent.
// Els encarregats veuen tot l'historial (opcionalment filtrat per tipus); la resta
// només veu allò del que han sigut responsables.
router.get('/historic', async (req: AuthRequest, res) => {
  const tipus = req.query.tipus as string | undefined;
  const filtreTipus =
    tipus === 'reten' ? { assignatAlReten: true } :
    tipus === 'quinzena' ? { assignatAQuinzena: true } :
    tipus === 'quinzenaB' ? { assignatAQuinzenaB: true } :
    {};

  const historic = await prisma.checklistHistoric.findMany({
    where: req.usuari!.rol === 'ENCARREGAT' ? filtreTipus : { ...filtreTipus, responsableId: req.usuari!.id },
    orderBy: { data: 'desc' },
    take: 60,
  });
  res.json(historic);
});

// Crear checklist amb els seus ítems (només encarregats) — assignada a un usuari i/o al retén
router.post('/', requireEncarregat, async (req: AuthRequest, res) => {
  const { nom, assignatAId, assignatAlReten, assignatAQuinzena, assignatAQuinzenaB, frequencia, items, data } = req.body; // items: string[]
  if (!assignatAId && !assignatAlReten && !assignatAQuinzena && !assignatAQuinzenaB) {
    return res.status(400).json({ error: "Cal assignar la checklist a algú, al retén o a una quinzena" });
  }
  const checklist = await prisma.checklist.create({
    data: {
      nom,
      assignatAId: assignatAId || null,
      assignatAlReten: !!assignatAlReten,
      assignatAQuinzena: !!assignatAQuinzena,
      assignatAQuinzenaB: !!assignatAQuinzenaB,
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

// Sincronitza les checklists manuals amb tots els punts de la capa COMPTADORS del mapa.
router.post('/comptadors/sincronitzar', async (_req, res) => {
  const resultat = await prisma.$transaction((tx) => sincronitzarChecklistDesDelMapa(tx), { maxWait: 10_000, timeout: 120_000 });
  res.json({ missatge: 'Checklists manuals sincronitzades amb tots els comptadors del mapa.', ...resultat });
});

// Editar dades bàsiques d'una checklist (només encarregats)
router.patch('/:id', requireEncarregat, async (req, res) => {
  const existent = await prisma.checklist.findUnique({ where: { id: req.params.id }, select: { origenComptadors: true } });
  if (existent?.origenComptadors) return res.status(409).json({ error: 'Les checklists de comptadors es gestionen des del mapa.' });
  const { nom, assignatAId, assignatAlReten, assignatAQuinzena, assignatAQuinzenaB, frequencia, data } = req.body;
  if (assignatAId === null && assignatAlReten === false && assignatAQuinzena === false && assignatAQuinzenaB === false) {
    return res.status(400).json({ error: "Cal assignar la checklist a algú, al retén o a una quinzena" });
  }
  const checklist = await prisma.checklist.update({
    where: { id: req.params.id },
    data: {
      nom,
      assignatAId: assignatAId === undefined ? undefined : assignatAId || null,
      assignatAlReten,
      assignatAQuinzena,
      assignatAQuinzenaB,
      frequencia,
      data: data ? new Date(data) : undefined,
    },
    include: includeAssignatA,
  });
  res.json(checklist);
});

// Eliminar una checklist (només encarregats)
router.delete('/:id', requireEncarregat, async (req, res) => {
  const existent = await prisma.checklist.findUnique({ where: { id: req.params.id }, select: { origenComptadors: true } });
  if (existent?.origenComptadors) return res.status(409).json({ error: 'Les checklists de comptadors es gestionen des del mapa.' });
  await prisma.checklistItem.deleteMany({ where: { checklistId: req.params.id } });
  await prisma.checklist.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// Afegir un ítem nou a una checklist existent (només encarregats)
router.post('/:id/items', requireEncarregat, async (req, res) => {
  const checklist = await prisma.checklist.findUnique({ where: { id: req.params.id }, select: { origenComptadors: true } });
  if (checklist?.origenComptadors) return res.status(409).json({ error: 'Afegeix comptadors al mapa perquè apareguin aquí automàticament.' });
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
  const existent = await prisma.checklistItem.findUnique({ where: { id: req.params.itemId } });
  if (!existent) return res.status(404).json({ error: 'Ítem no trobat' });
  if (existent.origenComptadorKey) {
    if (text !== undefined) return res.status(403).json({ error: 'El nom del comptador es modifica des del mapa.' });
    if (typeof marcat !== 'boolean') return res.status(400).json({ error: 'Cal indicar si el comptador s’ha completat.' });
    // El checklist de comptadors només el pot actualitzar un encarregat: la resta de gent
    // només el pot consultar (veure què queda pendent per tipus d'aigua).
    if (req.usuari!.rol !== 'ENCARREGAT') return res.status(403).json({ error: 'Només un encarregat pot actualitzar el checklist de comptadors.' });
    if (existent.marcat === marcat) return res.json(existent);
    const usuari = marcat ? await prisma.usuari.findUnique({ where: { id: req.usuari!.id }, select: { nom: true } }) : null;
    await prisma.checklistItem.updateMany({
      where: { id: existent.id, marcat: !marcat },
      data: marcat
        ? { marcat: true, completatPerId: req.usuari!.id, completatPerNom: usuari?.nom || 'Usuari', completatEl: new Date() }
        : { marcat: false, completatPerId: null, completatPerNom: null, completatEl: null },
    });
    return res.json(await prisma.checklistItem.findUnique({ where: { id: existent.id } }));
  }
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
  const existent = await prisma.checklistItem.findUnique({ where: { id: req.params.itemId }, select: { origenComptadorKey: true } });
  if (existent?.origenComptadorKey) return res.status(409).json({ error: 'Aquest comptador forma part del mapa i no es pot eliminar manualment.' });
  await prisma.checklistItem.delete({ where: { id: req.params.itemId } });
  res.status(204).send();
});

export default router;
