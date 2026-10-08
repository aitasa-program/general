import { Router, json } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { requireAuth, requireEncarregat, AuthRequest } from '../middleware/auth.middleware';
import { endpoint } from './arxiu.utils';

const router = Router();
router.use(requireAuth, json({ limit: '4mb' }));

const mimesAdmesos: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg' };

function publica(c: { colorPrimari: string; peuText: string | null; logoMime: string | null } | null) {
  return { colorPrimari: c?.colorPrimari || '#0066D6', peuText: c?.peuText || '', teLogo: !!c?.logoMime };
}

router.get('/', endpoint(async (_req, res) => {
  const config = await prisma.configPdf.findUnique({ where: { id: 'default' } });
  res.json(publica(config));
}));

router.get('/logo', endpoint(async (_req, res) => {
  const config = await prisma.configPdf.findUnique({ where: { id: 'default' }, select: { logoDades: true, logoMime: true } });
  if (!config?.logoDades) return res.status(404).json({ error: 'No hi ha logo configurat' });
  res.setHeader('Content-Type', config.logoMime || 'image/png');
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.send(config.logoDades);
}));

router.patch('/', requireEncarregat, endpoint(async (req: AuthRequest, res) => {
  const body = z.object({
    colorPrimari: z.string().trim().regex(/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/, 'Color no vàlid (format #rrggbb)').optional(),
    peuText: z.string().trim().max(300).optional(),
    logoBase64: z.string().min(4).max(2_000_000).regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/).optional(),
    logoNomFitxer: z.string().min(1).max(200).optional(),
    treureLogo: z.boolean().optional(),
  }).parse(req.body);

  let logoData: { logoDades: Buffer; logoMime: string } | undefined;
  if (body.logoBase64 && body.logoNomFitxer) {
    const ext = body.logoNomFitxer.split('.').pop()?.toLowerCase() || '';
    const mime = mimesAdmesos[ext];
    if (!mime) return res.status(400).json({ error: 'El logo ha de ser PNG o JPG.' });
    const bytes = Buffer.from(body.logoBase64, 'base64');
    if (!bytes.length || bytes.length > 1.5 * 1024 * 1024) return res.status(400).json({ error: 'El logo ha de pesar com a màxim 1,5 MB.' });
    const signaturaValida = ext === 'png' ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    if (!signaturaValida) return res.status(400).json({ error: 'El contingut no correspon al format del fitxer.' });
    logoData = { logoDades: bytes, logoMime: mime };
  }

  const actualitzat = await prisma.configPdf.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      colorPrimari: body.colorPrimari || '#0066D6',
      peuText: body.peuText || null,
      actualitzatPerId: req.usuari!.id,
      ...(logoData || {}),
    },
    update: {
      ...(body.colorPrimari ? { colorPrimari: body.colorPrimari } : {}),
      ...(body.peuText !== undefined ? { peuText: body.peuText || null } : {}),
      ...(body.treureLogo ? { logoDades: null, logoMime: null } : {}),
      ...(logoData || {}),
      actualitzatPerId: req.usuari!.id,
    },
  });
  res.json(publica(actualitzat));
}));

export default router;
