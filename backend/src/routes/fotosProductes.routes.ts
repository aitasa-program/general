import { Router, raw } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { requireAuth, requireEncarregat } from '../middleware/auth.middleware';
import { compteActiu, endpoint } from './arxiu.utils';

const router = Router();
router.use(requireAuth, compteActiu);
const meta = { id: true, nom: true, mime: true, creatEl: true } as const;
router.get('/:producteId', endpoint(async (req, res) => {
  res.json(await prisma.fotoProducte.findMany({ where: { producteId: req.params.producteId }, select: meta, orderBy: [{ creatEl: 'asc' }, { id: 'asc' }] }));
}));
router.get('/:producteId/:id', endpoint(async (req, res) => {
  const foto = await prisma.fotoProducte.findFirst({ where: { id: req.params.id, producteId: req.params.producteId } });
  if (!foto) return res.status(404).json({ error: 'Foto no trobada' });
  res.set({ 'Content-Type': foto.mime, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store' }).send(foto.dades);
}));
router.post('/:producteId/:id', requireEncarregat, raw({ type: () => true, limit: '10mb' }), endpoint(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const nom = z.string().trim().min(1).max(180).parse(req.query.nom);
  const dades = req.body as Buffer;
  if (!Buffer.isBuffer(dades) || !dades.length) return res.status(400).json({ error: 'Selecciona una foto' });
  const mime = dades.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'image/png'
    : dades[0] === 255 && dades[1] === 216 && dades[2] === 255 ? 'image/jpeg'
    : dades.toString('ascii',0,4) === 'RIFF' && dades.toString('ascii',8,12) === 'WEBP' ? 'image/webp' : null;
  if (!mime) return res.status(400).json({ error: 'Format no admès. Fes servir JPG, PNG o WebP.' });
  const result = await prisma.$transaction(async tx => {
    const productes = await tx.$queryRaw<Array<{id:string}>>`SELECT "id" FROM "Producte" WHERE "id" = ${req.params.producteId} FOR UPDATE`;
    if (!productes.length) return { status: 404, body: { error: 'Producte no trobat' } };
    const existent = await tx.fotoProducte.findUnique({ where: { id } });
    if (existent) return existent.producteId === req.params.producteId && existent.nom === nom && existent.dades.equals(dades)
      ? { status: 200, body: { id: existent.id, nom: existent.nom, mime: existent.mime, creatEl: existent.creatEl } }
      : { status: 409, body: { error: 'La foto ja existeix amb unes altres dades' } };
    if (await tx.fotoProducte.count({ where: { producteId: req.params.producteId } }) >= 10) return { status: 400, body: { error: 'Màxim 10 fotos per producte' } };
    return { status: 201, body: await tx.fotoProducte.create({ data: { id, producteId: req.params.producteId, nom, mime, dades }, select: meta }) };
  });
  res.status(result.status).json(result.body);
}));
router.delete('/:producteId/:id', requireEncarregat, endpoint(async (req, res) => {
  await prisma.fotoProducte.deleteMany({ where: { id: req.params.id, producteId: req.params.producteId } });
  res.status(204).send();
}));
export default router;
