import { Router, json } from 'express';
import { createHash } from 'crypto';
import { z } from 'zod';
import { prisma } from '../prisma';
import { requireAuth, requireEncarregat } from '../middleware/auth.middleware';
import { compteActiu, endpoint, enviarFitxer } from './arxiu.utils';

const router = Router();
router.use(requireAuth, compteActiu, json({ limit: '15mb' }));
const metadata = { id: true, carpetaId: true, nom: true, nomFitxer: true, mime: true, mida: true, sha256: true, autorNom: true, creatEl: true } as const;
router.get('/carpetes', endpoint(async (_req, res) => {
  res.json(await prisma.carpetaDocument.findMany({ orderBy: { nom: 'asc' }, include: { _count: { select: { documents: true } } } }));
}));
router.post('/carpetes', requireEncarregat, endpoint(async (req, res) => {
  const data = z.object({ nom: z.string().trim().min(1).max(120) }).parse(req.body);
  res.status(201).json(await prisma.carpetaDocument.create({ data }));
}));
router.get('/documents', endpoint(async (req, res) => {
  const { carpetaId, pagina } = z.object({ carpetaId: z.string().min(1).max(100), pagina: z.coerce.number().int().min(1).max(100000).default(1) }).parse(req.query);
  const [items, total] = await prisma.$transaction([
    prisma.documentArxiu.findMany({ where: { carpetaId }, select: metadata, orderBy: [{ creatEl: 'desc' }, { id: 'asc' }], take: 30, skip: (pagina - 1) * 30 }),
    prisma.documentArxiu.count({ where: { carpetaId } }),
  ]);
  res.json({ items, total, pagina });
}));
const mimeTypes: Record<string, string> = { pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', txt: 'text/plain', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg' };
router.post('/documents', requireEncarregat, endpoint(async (req, res) => {
  const body = z.object({ id: z.string().uuid(), carpetaId: z.string().min(1).max(100), nom: z.string().trim().min(1).max(180), nomFitxer: z.string().min(1).max(200).refine(n => !/[\\/\r\n\x00]/.test(n)), base64: z.string().min(4).max(14_000_000).regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/) }).parse(req.body);
  const ext = body.nomFitxer.split('.').pop()!.toLowerCase();
  if (!mimeTypes[ext]) return res.status(400).json({ error: 'Formats admesos: PDF, DOCX, XLSX, TXT, PNG i JPG.' });
  const bytes = Buffer.from(body.base64, 'base64');
  if (!bytes.length || bytes.length > 10 * 1024 * 1024) return res.status(400).json({ error: 'El fitxer ha de tenir com a màxim 10 MB.' });
  const signaturaValida = ext === 'pdf' ? bytes.subarray(0, 5).toString() === '%PDF-' : ['docx', 'xlsx'].includes(ext) ? bytes.subarray(0, 4).equals(Buffer.from([80, 75, 3, 4])) : ext === 'png' ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) : ['jpg', 'jpeg'].includes(ext) ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : !bytes.includes(0);
  if (!signaturaValida) return res.status(400).json({ error: 'El contingut no correspon al format del fitxer.' });
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const previ = await prisma.documentArxiu.findUnique({ where: { id: body.id }, select: metadata });
  if (previ) {
    if (previ.sha256 !== sha256 || previ.carpetaId !== body.carpetaId || previ.nom !== body.nom || previ.nomFitxer !== body.nomFitxer) return res.status(409).json({ error: 'Aquesta pujada ja s’ha guardat amb altres dades.' });
    return res.json(previ);
  }
  if (!await prisma.carpetaDocument.findUnique({ where: { id: body.carpetaId } })) return res.status(404).json({ error: 'Carpeta no trobada' });
  const autor = await prisma.usuari.findUniqueOrThrow({ where: { id: req.usuari!.id }, select: { nom: true } });
  res.status(201).json(await prisma.documentArxiu.create({ data: { id: body.id, carpetaId: body.carpetaId, nom: body.nom, nomFitxer: body.nomFitxer, mime: mimeTypes[ext], mida: bytes.length, contingut: bytes, sha256, autorId: req.usuari!.id, autorNom: autor.nom }, select: metadata }));
}));
router.get('/documents/:id/fitxer', endpoint(async (req, res) => {
  const d = await prisma.documentArxiu.findUnique({ where: { id: req.params.id } });
  if (!d) return res.status(404).json({ error: 'Document no trobat' });
  enviarFitxer(res, d.contingut, d.mime, d.nomFitxer);
}));
export default router;
