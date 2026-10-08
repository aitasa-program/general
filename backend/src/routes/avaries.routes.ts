import { Router, json } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware';
import { diagnosticarAvaria, iaAvariesConfigurada } from '../services/iaAvariesAgent.service';
import { endpoint } from './arxiu.utils';

const router = Router();
router.use(requireAuth, json({ limit: '10mb' }));

const mimesAdmesos: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg' };
const resum = { id: true, problema: true, solucio: true, fotoMime: true, usuariNom: true, creatEl: true } as const;

function validarFoto(base64: string | undefined, nomFitxer: string | undefined, requerida: boolean) {
  if (!base64 || !nomFitxer) {
    if (requerida) throw new Error('Cal adjuntar una foto');
    return undefined;
  }
  const ext = nomFitxer.split('.').pop()?.toLowerCase() || '';
  const mime = mimesAdmesos[ext];
  if (!mime) throw new Error('La foto ha de ser PNG o JPG.');
  const bytes = Buffer.from(base64, 'base64');
  if (!bytes.length || bytes.length > 8 * 1024 * 1024) throw new Error('La foto ha de pesar com a màxim 8 MB.');
  const signaturaValida = ext === 'png' ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (!signaturaValida) throw new Error('El contingut no correspon al format del fitxer.');
  return { bytes, mime, base64 };
}

router.get('/estat', (_req, res) => {
  res.json({ iaConfigurada: iaAvariesConfigurada() });
});

// Historial compartit: tothom pot veure i aprofitar les avaries ja registrades.
router.get('/', endpoint(async (_req, res) => {
  const avaries = await prisma.registreAvaria.findMany({ select: resum, orderBy: { creatEl: 'desc' }, take: 100 });
  res.json(avaries.map((a) => ({ ...a, teFoto: !!a.fotoMime })));
}));

router.get('/:id/foto', endpoint(async (req, res) => {
  const avaria = await prisma.registreAvaria.findUnique({ where: { id: req.params.id } });
  if (!avaria?.fotoDades) return res.status(404).json({ error: 'Foto no trobada' });
  res.setHeader('Content-Type', avaria.fotoMime || 'image/png');
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.send(avaria.fotoDades);
}));

// Registrar una avaria (amb solució, si ja es coneix) perquè quedi com a referència futura.
router.post('/', endpoint(async (req: AuthRequest, res) => {
  const body = z.object({
    problema: z.string().trim().min(1).max(2000),
    solucio: z.string().trim().max(2000).optional(),
    fotoBase64: z.string().min(4).max(11_000_000).regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/).optional(),
    fotoNomFitxer: z.string().min(1).max(200).optional(),
  }).parse(req.body);
  let foto;
  try { foto = validarFoto(body.fotoBase64, body.fotoNomFitxer, false); } catch (e) { return res.status(400).json({ error: (e as Error).message }); }
  const autor = await prisma.usuari.findUniqueOrThrow({ where: { id: req.usuari!.id }, select: { nom: true } });
  const avaria = await prisma.registreAvaria.create({
    data: {
      problema: body.problema, solucio: body.solucio || null,
      fotoDades: foto?.bytes, fotoMime: foto?.mime,
      usuariId: req.usuari!.id, usuariNom: autor.nom,
    },
    select: resum,
  });
  res.status(201).json({ ...avaria, teFoto: !!avaria.fotoMime });
}));

// Afegir o corregir la solució d'una avaria ja registrada (qualsevol usuari, és coneixement compartit).
router.patch('/:id', endpoint(async (req, res) => {
  const existent = await prisma.registreAvaria.findUnique({ where: { id: req.params.id } });
  if (!existent) return res.status(404).json({ error: 'Avaria no trobada' });
  const body = z.object({ solucio: z.string().trim().max(2000) }).parse(req.body);
  const avaria = await prisma.registreAvaria.update({ where: { id: req.params.id }, data: { solucio: body.solucio }, select: resum });
  res.json({ ...avaria, teFoto: !!avaria.fotoMime });
}));

// Demana a la IA un diagnòstic per a una foto nova, comparant-la amb les avaries ja
// resoltes. No desa res; si l'usuari vol, pot registrar el cas nou per separat.
router.post('/diagnosticar', endpoint(async (req, res) => {
  if (!iaAvariesConfigurada()) return res.status(503).json({ error: "La IA no està configurada (falta IA_GEMINI_API_KEY al servidor)." });
  const body = z.object({
    descripcio: z.string().trim().max(2000).default(''),
    fotoBase64: z.string().min(4).max(11_000_000).regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/),
    fotoNomFitxer: z.string().min(1).max(200),
  }).parse(req.body);
  let foto;
  try { foto = validarFoto(body.fotoBase64, body.fotoNomFitxer, true); } catch (e) { return res.status(400).json({ error: (e as Error).message }); }

  const casosPrevis = await prisma.registreAvaria.findMany({
    where: { solucio: { not: null } },
    select: { problema: true, solucio: true, fotoDades: true, fotoMime: true },
    orderBy: { creatEl: 'desc' },
    take: 15,
  });

  try {
    const suggeriment = await diagnosticarAvaria(
      body.descripcio,
      foto!.mime,
      foto!.base64,
      casosPrevis.map((c) => ({
        problema: c.problema,
        solucio: c.solucio || '',
        fotoMime: c.fotoMime,
        fotoBase64: c.fotoDades ? Buffer.from(c.fotoDades).toString('base64') : null,
      }))
    );
    res.json({ suggeriment, casosConsultats: casosPrevis.length });
  } catch (e) {
    res.status(502).json({ error: `No s'ha pogut generar el diagnòstic: ${(e as Error).message}` });
  }
}));

export default router;
