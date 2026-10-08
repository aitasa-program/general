import { Router, json } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware';
import { endpoint } from './arxiu.utils';

const router = Router();
router.use(requireAuth, json({ limit: '8mb' }));

const mimesAdmesos: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg' };
const resum = { id: true, text: true, fotoMime: true, creatEl: true, actualitzatEl: true } as const;

function validarFoto(base64: string | undefined, nomFitxer: string | undefined) {
  if (!base64 || !nomFitxer) return undefined;
  const ext = nomFitxer.split('.').pop()?.toLowerCase() || '';
  const mime = mimesAdmesos[ext];
  if (!mime) throw new Error('La foto ha de ser PNG o JPG.');
  const bytes = Buffer.from(base64, 'base64');
  if (!bytes.length || bytes.length > 6 * 1024 * 1024) throw new Error('La foto ha de pesar com a màxim 6 MB.');
  const signaturaValida = ext === 'png' ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (!signaturaValida) throw new Error('El contingut no correspon al format del fitxer.');
  return { fotoDades: bytes, fotoMime: mime };
}

// Totes les rutes filtren sempre per l'usuari de la sessió: és un espai privat,
// ni altres treballadors ni encarregats poden veure les notes d'una altra persona.

router.get('/', endpoint(async (req: AuthRequest, res) => {
  const notes = await prisma.notaPersonal.findMany({ where: { usuariId: req.usuari!.id }, select: resum, orderBy: { actualitzatEl: 'desc' } });
  res.json(notes.map((n) => ({ ...n, teFoto: !!n.fotoMime })));
}));

router.post('/', endpoint(async (req: AuthRequest, res) => {
  const body = z.object({
    text: z.string().trim().max(5000).default(''),
    fotoBase64: z.string().min(4).max(8_000_000).regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/).optional(),
    fotoNomFitxer: z.string().min(1).max(200).optional(),
  }).parse(req.body);
  if (!body.text && !body.fotoBase64) return res.status(400).json({ error: 'Escriu alguna cosa o adjunta una foto' });
  let foto;
  try { foto = validarFoto(body.fotoBase64, body.fotoNomFitxer); } catch (e) { return res.status(400).json({ error: (e as Error).message }); }
  const nota = await prisma.notaPersonal.create({ data: { usuariId: req.usuari!.id, text: body.text, ...foto }, select: resum });
  res.status(201).json({ ...nota, teFoto: !!nota.fotoMime });
}));

router.patch('/:id', endpoint(async (req: AuthRequest, res) => {
  const existent = await prisma.notaPersonal.findUnique({ where: { id: req.params.id } });
  if (!existent || existent.usuariId !== req.usuari!.id) return res.status(404).json({ error: 'Nota no trobada' });
  const body = z.object({
    text: z.string().trim().max(5000).optional(),
    fotoBase64: z.string().min(4).max(8_000_000).regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/).optional(),
    fotoNomFitxer: z.string().min(1).max(200).optional(),
    treureFoto: z.boolean().optional(),
  }).parse(req.body);
  let foto;
  try { foto = validarFoto(body.fotoBase64, body.fotoNomFitxer); } catch (e) { return res.status(400).json({ error: (e as Error).message }); }
  const nota = await prisma.notaPersonal.update({
    where: { id: req.params.id },
    data: { ...(body.text !== undefined ? { text: body.text } : {}), ...(body.treureFoto ? { fotoDades: null, fotoMime: null } : {}), ...foto },
    select: resum,
  });
  res.json({ ...nota, teFoto: !!nota.fotoMime });
}));

router.delete('/:id', endpoint(async (req: AuthRequest, res) => {
  const existent = await prisma.notaPersonal.findUnique({ where: { id: req.params.id } });
  if (!existent || existent.usuariId !== req.usuari!.id) return res.status(404).json({ error: 'Nota no trobada' });
  await prisma.notaPersonal.delete({ where: { id: req.params.id } });
  res.status(204).send();
}));

router.get('/:id/foto', endpoint(async (req: AuthRequest, res) => {
  const nota = await prisma.notaPersonal.findUnique({ where: { id: req.params.id } });
  if (!nota || nota.usuariId !== req.usuari!.id || !nota.fotoDades) return res.status(404).json({ error: 'Foto no trobada' });
  res.setHeader('Content-Type', nota.fotoMime || 'image/png');
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(nota.fotoDades);
}));

export default router;
