import { Router, json } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { requireAuth, requireEncarregat } from '../middleware/auth.middleware';
import { endpoint, compteActiu } from './arxiu.utils';
import { parseKml } from '../services/mapaKml.service';

const router = Router();
router.use(requireAuth, compteActiu, json({ limit: '10mb' }));

// Totes les capes del mapa (xarxes, pous, comptadors...) amb els seus punts.
router.get('/dades', endpoint(async (_req, res) => {
  const capes = await prisma.capaMapa.findMany({
    orderBy: { nom: 'asc' },
    include: { punts: { select: { nom: true, descripcio: true, lat: true, lon: true }, orderBy: { nom: 'asc' } } },
  });
  res.json(capes);
}));

const nomSchema = z.object({ nom: z.string().trim().min(1).max(120) });
router.patch('/capes/:id', requireEncarregat, endpoint(async (req, res) => {
  const { nom } = nomSchema.parse(req.body);
  const capa = await prisma.capaMapa.findUnique({ where: { id: req.params.id } });
  if (!capa) return res.status(404).json({ error: 'Capa no trobada' });
  res.json(await prisma.capaMapa.update({ where: { id: capa.id }, data: { nom } }));
}));

// Torna a importar el mapa des d'un KML exportat de Google Earth: reemplaça totes les
// capes i punts per les del fitxer nou. Es manté el nom de les capes que ja existien
// (per no perdre un nom personalitzat), només s'actualitza el color i els punts.
const importSchema = z.object({ base64: z.string().min(4).max(14_000_000).regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/) });
router.post('/importar', requireEncarregat, endpoint(async (req, res) => {
  const { base64 } = importSchema.parse(req.body);
  const bytes = Buffer.from(base64, 'base64');
  if (!bytes.length || bytes.length > 10 * 1024 * 1024) return res.status(400).json({ error: 'El fitxer ha de tenir com a màxim 10 MB.' });
  let capesNoves;
  try { capesNoves = parseKml(bytes.toString('utf-8')); }
  catch { return res.status(400).json({ error: 'No s’ha pogut llegir el fitxer. Comprova que sigui un KML exportat de Google Earth.' }); }
  if (!capesNoves.length) return res.status(400).json({ error: 'El KML no conté cap carpeta amb punts.' });

  await prisma.$transaction(async tx => {
    const existents = await tx.capaMapa.findMany({ select: { id: true, nom: true } });
    const nomsExistents = new Map(existents.map(c => [c.id, c.nom]));
    const idsNous = new Set(capesNoves.map(c => c.id));
    const aEliminar = existents.map(c => c.id).filter(id => !idsNous.has(id));
    if (aEliminar.length) await tx.capaMapa.deleteMany({ where: { id: { in: aEliminar } } });
    for (const c of capesNoves) {
      await tx.capaMapa.upsert({
        where: { id: c.id },
        create: { id: c.id, nom: c.nom, color: c.color },
        update: { color: c.color, ...(nomsExistents.has(c.id) ? {} : { nom: c.nom }) },
      });
      await tx.puntMapa.deleteMany({ where: { capaId: c.id } });
      await tx.puntMapa.createMany({ data: c.punts.map(p => ({ capaId: c.id, nom: p.nom, descripcio: p.descripcio || null, lat: p.lat, lon: p.lon })) });
    }
  });
  const total = capesNoves.reduce((n, c) => n + c.punts.length, 0);
  res.json({ capes: capesNoves.length, punts: total });
}));

export default router;
