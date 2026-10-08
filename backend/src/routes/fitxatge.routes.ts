import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { requireAuth, requireEncarregat, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

const includeUsuari = { usuari: { select: { id: true, nom: true } }, llocTreball: true, franjaHoraria: true };

function potModificar(req: AuthRequest, usuariId: string) {
  return req.usuari!.rol === 'ENCARREGAT' || req.usuari!.id === usuariId;
}

// --- Llocs de treball (manteniment només per a encarregats) ---

router.get('/llocs', async (_req, res) => {
  const llocs = await prisma.llocTreball.findMany({ orderBy: { nom: 'asc' } });
  res.json(llocs);
});

router.post('/llocs', requireEncarregat, async (req, res) => {
  const { nom } = req.body;
  if (!nom) return res.status(400).json({ error: 'Cal indicar un nom pel lloc de treball' });
  try {
    const lloc = await prisma.llocTreball.create({ data: { nom } });
    res.status(201).json(lloc);
  } catch {
    res.status(400).json({ error: 'No s\'ha pogut crear el lloc (potser ja existeix)' });
  }
});

router.patch('/llocs/:id', requireEncarregat, async (req, res) => {
  const { nom } = req.body;
  if (!nom) return res.status(400).json({ error: 'Cal indicar un nom pel lloc de treball' });
  try {
    const lloc = await prisma.llocTreball.update({ where: { id: req.params.id }, data: { nom } });
    res.json(lloc);
  } catch {
    res.status(400).json({ error: "No s'ha pogut actualitzar el lloc (potser el nom ja existeix)" });
  }
});

router.delete('/llocs/:id', requireEncarregat, async (req, res) => {
  try {
    await prisma.llocTreball.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(409).json({ error: 'No es pot eliminar: aquest lloc té fitxatges associats.' });
  }
});

// --- Franges horàries (manteniment només per a encarregats) ---

router.get('/franges', async (_req, res) => {
  const franges = await prisma.franjaHoraria.findMany({ orderBy: { hores: 'asc' } });
  res.json(franges);
});

router.post('/franges', requireEncarregat, async (req, res) => {
  const { nom, hores } = req.body;
  if (!nom || hores === undefined || hores === '') {
    return res.status(400).json({ error: 'Cal indicar un nom i les hores de la franja' });
  }
  try {
    const franja = await prisma.franjaHoraria.create({ data: { nom, hores: Number(hores) } });
    res.status(201).json(franja);
  } catch {
    res.status(400).json({ error: 'No s\'ha pogut crear la franja (potser ja existeix)' });
  }
});

router.patch('/franges/:id', requireEncarregat, async (req, res) => {
  const { nom, hores } = req.body;
  try {
    const franja = await prisma.franjaHoraria.update({
      where: { id: req.params.id },
      data: { nom, hores: hores === undefined ? undefined : Number(hores) },
    });
    res.json(franja);
  } catch {
    res.status(400).json({ error: "No s'ha pogut actualitzar la franja (potser el nom ja existeix)" });
  }
});

router.delete('/franges/:id', requireEncarregat, async (req, res) => {
  try {
    await prisma.franjaHoraria.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(409).json({ error: 'No es pot eliminar: aquesta franja té fitxatges associats.' });
  }
});

// --- Camps addicionals del fitxatge (manteniment només per a encarregats) ---

router.get('/camps', async (req: AuthRequest, res) => {
  const camps = await prisma.campFitxatge.findMany({
    where: req.usuari!.rol === 'ENCARREGAT' ? {} : { activa: true },
    orderBy: { ordre: 'asc' },
  });
  res.json(camps);
});

router.post('/camps', requireEncarregat, async (req, res) => {
  const { nom, tipus, opcions } = req.body;
  if (!nom) return res.status(400).json({ error: 'Cal indicar un nom pel camp' });
  const ultim = await prisma.campFitxatge.aggregate({ _max: { ordre: true } });
  const camp = await prisma.campFitxatge.create({
    data: { nom, tipus: tipus || 'text', opcions: opcions || undefined, ordre: (ultim._max.ordre ?? -1) + 1 },
  });
  res.status(201).json(camp);
});

router.patch('/camps/:id', requireEncarregat, async (req, res) => {
  const { nom, tipus, opcions, activa } = req.body;
  try {
    const camp = await prisma.campFitxatge.update({
      where: { id: req.params.id },
      data: { nom, tipus, opcions: opcions === undefined ? undefined : opcions || null, activa },
    });
    res.json(camp);
  } catch {
    res.status(400).json({ error: "No s'ha pogut actualitzar el camp" });
  }
});

router.delete('/camps/:id', requireEncarregat, async (req, res) => {
  await prisma.campFitxatge.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// --- Fitxatges ---

// Només es conserven valors de camps que encara existeixen com a CampFitxatge.
async function netejarCamps(camps: unknown): Promise<Record<string, string> | undefined> {
  if (!camps || typeof camps !== 'object') return undefined;
  const definicions = await prisma.campFitxatge.findMany({ select: { id: true } });
  const idsValids = new Set(definicions.map((d) => d.id));
  const net: Record<string, string> = {};
  for (const [k, v] of Object.entries(camps as Record<string, unknown>)) {
    if (idsValids.has(k) && typeof v === 'string' && v.trim()) net[k] = v.trim();
  }
  return net;
}

// Llista de fitxatges: un treballador només veu els seus, un encarregat els veu tots
router.get('/', async (req: AuthRequest, res) => {
  const fitxatges = await prisma.fitxatge.findMany({
    where: req.usuari!.rol === 'ENCARREGAT' ? undefined : { usuariId: req.usuari!.id },
    include: includeUsuari,
    orderBy: { data: 'desc' },
  });
  res.json(fitxatges);
});

// Apuntar una jornada: dia, lloc de treball i què s'ha fet
// (la franja horària és opcional, només per si es vol precisar les hores)
router.post('/', async (req: AuthRequest, res) => {
  const { data, llocTreballId, franjaHorariaId, descripcio, camps } = req.body;
  if (!data || !llocTreballId || !descripcio) {
    return res.status(400).json({ error: 'Cal indicar el dia, el lloc i què has fet' });
  }
  let hores: number | null = null;
  if (franjaHorariaId) {
    const franja = await prisma.franjaHoraria.findUnique({ where: { id: franjaHorariaId } });
    if (!franja) return res.status(400).json({ error: 'Franja horària no vàlida' });
    hores = franja.hores;
  }
  const fitxatge = await prisma.fitxatge.create({
    data: {
      usuariId: req.usuari!.id,
      data: new Date(data),
      llocTreballId,
      franjaHorariaId: franjaHorariaId || null,
      hores,
      descripcio,
      camps: (await netejarCamps(camps)) ?? undefined,
    },
    include: includeUsuari,
  });
  res.status(201).json(fitxatge);
});

// Editar un fitxatge (el propi autor o un encarregat)
router.patch('/:id', async (req: AuthRequest, res) => {
  const existent = await prisma.fitxatge.findUnique({ where: { id: req.params.id } });
  if (!existent) return res.status(404).json({ error: 'Fitxatge no trobat' });
  if (!potModificar(req, existent.usuariId)) {
    return res.status(403).json({ error: 'No pots editar un fitxatge que no és teu' });
  }
  const { data, llocTreballId, franjaHorariaId, descripcio, camps } = req.body;
  let hores: number | null | undefined;
  if (franjaHorariaId) {
    const franja = await prisma.franjaHoraria.findUnique({ where: { id: franjaHorariaId } });
    if (!franja) return res.status(400).json({ error: 'Franja horària no vàlida' });
    hores = franja.hores;
  } else if (franjaHorariaId === null) {
    hores = null;
  }
  try {
    const fitxatge = await prisma.fitxatge.update({
      where: { id: req.params.id },
      data: {
        data: data ? new Date(data) : undefined,
        llocTreballId,
        franjaHorariaId,
        hores,
        descripcio,
        camps: camps === undefined ? undefined : (await netejarCamps(camps)) ?? Prisma.JsonNull,
      },
      include: includeUsuari,
    });
    res.json(fitxatge);
  } catch {
    res.status(400).json({ error: "No s'ha pogut actualitzar el fitxatge" });
  }
});

// Eliminar un fitxatge (el propi autor o un encarregat)
router.delete('/:id', async (req: AuthRequest, res) => {
  const existent = await prisma.fitxatge.findUnique({ where: { id: req.params.id } });
  if (!existent) return res.status(404).json({ error: 'Fitxatge no trobat' });
  if (!potModificar(req, existent.usuariId)) {
    return res.status(403).json({ error: 'No pots eliminar un fitxatge que no és teu' });
  }
  await prisma.fitxatge.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
