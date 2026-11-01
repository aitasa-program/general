import { Router, json } from 'express';
import { TipusAigua } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../prisma';
import { requireAuth, requireEncarregat } from '../middleware/auth.middleware';
import { endpoint, compteActiu } from './arxiu.utils';
import { parseKml } from '../services/mapaKml.service';
import { normalitzar, sincronitzarChecklistDesDelMapa, trobarCapaComptadors } from '../services/mapaComptadorsChecklist.service';

const router = Router();
// Un KML de 25 MB es codifica en Base64 i ocupa prop de 34 MB dins del JSON.
router.use(requireAuth, compteActiu, json({ limit: '36mb' }));

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

const tipusPuntSchema = z.object({
  tipusAigua: z.enum(['XARXA_INDUSTRIAL', 'XARXA_REGENERADA', 'XARXA_CLORADA', 'TRACTAMENT_CONJUNT']).nullable(),
});
router.patch('/punts/:id', requireEncarregat, endpoint(async (req, res) => {
  const { tipusAigua } = tipusPuntSchema.parse(req.body);
  const punt = await prisma.puntMapa.findUnique({ where: { id: req.params.id }, include: { capa: true } });
  if (!punt) return res.status(404).json({ error: 'Comptador del mapa no trobat' });
  const capes = await prisma.capaMapa.findMany({ include: { punts: { select: { nom: true } } } });
  if (trobarCapaComptadors(capes)?.id !== punt.capaId) return res.status(400).json({ error: 'Aquest punt no pertany a la capa de comptadors.' });
  const resultat = await prisma.$transaction(async (tx) => {
    const actualitzat = await tx.puntMapa.update({ where: { id: punt.id }, data: { tipusAigua } });
    const checklists = await sincronitzarChecklistDesDelMapa(tx);
    return { punt: actualitzat, checklists };
  }, { maxWait: 10_000, timeout: 120_000 });
  res.json(resultat);
}));

// Torna a importar el mapa des d'un KML exportat de Google Earth: reemplaça totes les
// capes i punts amb les dades i els noms del fitxer nou.
const importSchema = z.object({ base64: z.string().min(4).max(35_000_000).regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/) });
router.post('/importar', requireEncarregat, endpoint(async (req, res) => {
  const { base64 } = importSchema.parse(req.body);
  const bytes = Buffer.from(base64, 'base64');
  if (!bytes.length || bytes.length > 25 * 1024 * 1024) return res.status(400).json({ error: 'El fitxer ha de tenir com a màxim 25 MB.' });
  let capesNoves;
  try { capesNoves = parseKml(bytes.toString('utf-8')); }
  catch { return res.status(400).json({ error: 'No s’ha pogut llegir el fitxer. Comprova que sigui un KML exportat de Google Earth.' }); }
  if (!capesNoves.length) return res.status(400).json({ error: 'El KML no conté cap carpeta amb punts.' });

  const checklists = await prisma.$transaction(async tx => {
    const existents = await tx.capaMapa.findMany({ include: { punts: { select: { nom: true, descripcio: true, lat: true, lon: true, tipusAigua: true } } } });
    const capaComptadorsAnterior = trobarCapaComptadors(existents);
    const capaComptadorsNova = trobarCapaComptadors(capesNoves);
    const tipusPerCoordenades = new Map<string, TipusAigua>();
    const tipusPerNom = new Map<string, TipusAigua>();
    for (const punt of capaComptadorsAnterior?.punts || []) {
      if (!punt.tipusAigua) continue;
      tipusPerCoordenades.set(`${punt.lat.toFixed(6)}|${punt.lon.toFixed(6)}`, punt.tipusAigua);
      tipusPerNom.set(normalitzar(punt.nom), punt.tipusAigua);
    }
    const idsNous = new Set(capesNoves.map(c => c.id));
    const aEliminar = existents.map(c => c.id).filter(id => !idsNous.has(id));
    if (aEliminar.length) await tx.capaMapa.deleteMany({ where: { id: { in: aEliminar } } });
    for (const c of capesNoves) {
      await tx.capaMapa.upsert({
        where: { id: c.id },
        create: { id: c.id, nom: c.nom, color: c.color },
        update: { nom: c.nom, color: c.color },
      });
      await tx.puntMapa.deleteMany({ where: { capaId: c.id } });
      await tx.puntMapa.createMany({ data: c.punts.map(p => ({
        capaId: c.id,
        nom: p.nom,
        descripcio: p.descripcio || null,
        lat: p.lat,
        lon: p.lon,
        tipusAigua: c.id === capaComptadorsNova?.id
          ? tipusPerCoordenades.get(`${p.lat.toFixed(6)}|${p.lon.toFixed(6)}`) || tipusPerNom.get(normalitzar(p.nom)) || null
          : null,
      })) });
    }
    return sincronitzarChecklistDesDelMapa(tx);
  }, { maxWait: 10_000, timeout: 120_000 });
  const total = capesNoves.reduce((n, c) => n + c.punts.length, 0);
  res.json({ capes: capesNoves.length, punts: total, checklists });
}));

export default router;
