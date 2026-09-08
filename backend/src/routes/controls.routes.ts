import { Router, json } from 'express';
import { createHash } from 'crypto';
import { z } from 'zod';
import { prisma } from '../prisma';
import { requireAuth, requireEncarregat } from '../middleware/auth.middleware';
import { compteActiu, endpoint, enviarFitxer } from './arxiu.utils';
import { CampControl, diaSchema, plantillaSchema, registreSchema, validarValors } from '../services/control.validation';
import { generarControlPdf } from '../services/controlPdf.service';

const router = Router();
router.use(requireAuth, compteActiu, json({ limit: '512kb' }));
const resum = { id: true, plantillaId: true, nom: true, versio: true, dia: true, autorId: true, autorNom: true, creatEl: true, sha256: true, rectificaId: true, motiu: true, rectificacio: { select: { id: true } } } as const;

router.get('/plantilles', endpoint(async (req, res) => {
  res.json(await prisma.plantillaControl.findMany({ where: req.usuari!.rol === 'ENCARREGAT' ? {} : { activa: true }, orderBy: { nom: 'asc' } }));
}));
router.post('/plantilles', requireEncarregat, endpoint(async (req, res) => {
  res.status(201).json(await prisma.plantillaControl.create({ data: plantillaSchema.parse(req.body) }));
}));
router.patch('/plantilles/:id', requireEncarregat, endpoint(async (req, res) => {
  const { versio, ...data } = plantillaSchema.extend({ activa: z.boolean(), versio: z.number().int().positive() }).parse(req.body);
  const result = await prisma.plantillaControl.updateMany({ where: { id: req.params.id, versio }, data: { ...data, versio: { increment: 1 } } });
  if (!result.count) return res.status(409).json({ error: 'La plantilla ha canviat. Actualitza-la abans de desar.' });
  res.json(await prisma.plantillaControl.findUnique({ where: { id: req.params.id } }));
}));
router.get('/registres', endpoint(async (req, res) => {
  const q = z.object({ desDe: diaSchema.optional(), fins: diaSchema.optional(), plantillaId: z.string().uuid().optional(), pagina: z.coerce.number().int().min(1).max(100000).default(1) }).parse(req.query);
  const where = { plantillaId: q.plantillaId, dia: { gte: q.desDe, lte: q.fins } };
  const [items, total] = await prisma.$transaction([
    prisma.registreControl.findMany({ where, select: resum, orderBy: [{ dia: 'desc' }, { creatEl: 'desc' }, { id: 'asc' }], take: 30, skip: (q.pagina - 1) * 30 }),
    prisma.registreControl.count({ where }),
  ]);
  res.json({ items, total, pagina: q.pagina });
}));
router.get('/registres/:id', endpoint(async (req, res) => {
  const r = await prisma.registreControl.findUnique({ where: { id: req.params.id }, select: { ...resum, camps: true, valors: true } });
  if (!r) return res.status(404).json({ error: 'Registre no trobat' });
  res.json(r);
}));
router.get('/registres/:id/pdf', endpoint(async (req, res) => {
  const r = await prisma.registreControl.findUnique({ where: { id: req.params.id }, select: { id: true, dia: true, pdf: true } });
  if (!r) return res.status(404).json({ error: 'Registre no trobat' });
  enviarFitxer(res, r.pdf, 'application/pdf', `control-${r.dia}-${r.id}.pdf`);
}));
router.post('/registres', endpoint(async (req, res) => {
  const body = registreSchema.parse(req.body);
  const empremtaSollicitud = createHash('sha256').update(JSON.stringify({ ...body, valors: Object.fromEntries(Object.entries(body.valors).sort()), autor: req.usuari!.id })).digest('hex');
  const previ = await prisma.registreControl.findUnique({ where: { id: body.id }, select: { ...resum, empremtaSollicitud: true } });
  if (previ) {
    if (previ.empremtaSollicitud !== empremtaSollicitud) return res.status(409).json({ error: 'Aquesta petició ja es va guardar amb unes altres dades. Consulta l’historial.' });
    const { empremtaSollicitud: _, ...r } = previ;
    return res.json(r);
  }
  const plantilla = await prisma.plantillaControl.findUnique({ where: { id: body.plantillaId } });
  if (!plantilla) return res.status(404).json({ error: 'Plantilla no trobada' });
  const original = body.rectificaId ? await prisma.registreControl.findUnique({ where: { id: body.rectificaId }, select: { ...resum, camps: true } }) : null;
  if (body.rectificaId && (!original || original.plantillaId !== plantilla.id)) return res.status(400).json({ error: 'Registre original no vàlid' });
  if (original && (original.rectificacio || !body.motiu)) return res.status(409).json({ error: 'Indica el motiu o obre la rectificació més recent.' });
  if (original && original.autorId !== req.usuari!.id && req.usuari!.rol !== 'ENCARREGAT') return res.status(403).json({ error: 'Només l’autor o un administrador pot rectificar aquest registre.' });
  if (!original && (!plantilla.activa || plantilla.versio !== body.versio)) return res.status(409).json({ error: 'La plantilla ha canviat o està arxivada. Torna a obrir el formulari.' });
  const camps = (original?.camps || plantilla.camps) as unknown as CampControl[];
  let valors: Record<string, string>;
  try { valors = validarValors(camps, body.valors); } catch (e) { return res.status(400).json({ error: (e as Error).message }); }
  const autor = await prisma.usuari.findUniqueOrThrow({ where: { id: req.usuari!.id }, select: { nom: true } });
  const dades = { id: body.id, plantillaId: plantilla.id, nom: original?.nom || plantilla.nom, versio: original?.versio || plantilla.versio, camps, valors, dia: body.dia, autorId: req.usuari!.id, autorNom: autor.nom, creatEl: new Date(), rectificaId: body.rectificaId, motiu: body.motiu };
  const pdf = generarControlPdf(dades);
  res.status(201).json(await prisma.registreControl.create({ data: { ...dades, pdf, empremtaSollicitud, sha256: createHash('sha256').update(pdf).digest('hex') }, select: resum }));
}));
export default router;
