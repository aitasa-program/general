import { Router, json } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { requireAuth, requireEncarregat, AuthRequest } from '../middleware/auth.middleware';
import { demanarCanvi, iaConfigurada } from '../services/iaAgent.service';
import { aplicarCommit, brancaDestinacio, repoConfigurat } from '../services/githubRepo.service';

const router = Router();
router.use(requireAuth, requireEncarregat, json({ limit: '40mb' }));

const resum = {
  id: true, prompt: true, adjunts: true, resum: true, missatgeCommit: true, estat: true, error: true, commitSha: true,
  creatPer: { select: { id: true, nom: true } }, aplicatPer: { select: { id: true, nom: true } },
  creatEl: true, resoltEl: true,
} as const;

const mimesAdmesos: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', pdf: 'application/pdf' };
const adjuntSchema = z.object({
  nom: z.string().trim().min(1).max(180).refine((n) => !/[\\/\r\n\x00]/.test(n)),
  base64: z.string().min(4).max(11_000_000).regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/),
});
const adjuntsSchema = z.array(adjuntSchema).max(5).optional();

function validarAdjunts(raw: unknown): { nom: string; mime: string; base64: string }[] {
  const adjunts = adjuntsSchema.parse(raw) || [];
  return adjunts.map((a) => {
    const ext = a.nom.split('.').pop()?.toLowerCase() || '';
    const mime = mimesAdmesos[ext];
    if (!mime) throw new Error(`Format no admès: ${a.nom}. Només es poden adjuntar fotos (PNG/JPG) i PDF.`);
    const bytes = Buffer.from(a.base64, 'base64');
    if (!bytes.length || bytes.length > 8 * 1024 * 1024) throw new Error(`${a.nom} ha de tenir com a màxim 8 MB.`);
    const signaturaValida =
      ext === 'pdf' ? bytes.subarray(0, 5).toString() === '%PDF-' :
      ext === 'png' ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) :
      bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    if (!signaturaValida) throw new Error(`El contingut de ${a.nom} no correspon al format del fitxer.`);
    return { nom: a.nom, mime, base64: a.base64 };
  });
}

router.get('/estat', (_req, res) => {
  res.json({ iaConfigurada: iaConfigurada(), repoConfigurat: repoConfigurat(), branca: brancaDestinacio() });
});

router.get('/', async (_req, res) => {
  const propostes = await prisma.propostaIA.findMany({ select: { ...resum, fitxers: true }, orderBy: { creatEl: 'desc' }, take: 50 });
  res.json(propostes);
});

router.post('/', async (req: AuthRequest, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Cal descriure quin canvi vols demanar' });
  }
  if (!iaConfigurada()) return res.status(503).json({ error: "La IA no està configurada (falta IA_GEMINI_API_KEY al servidor)." });
  if (!repoConfigurat()) return res.status(503).json({ error: "L'accés al repositori no està configurat (falten IA_GITHUB_TOKEN / IA_GITHUB_REPO al servidor)." });

  let adjunts: { nom: string; mime: string; base64: string }[];
  try {
    adjunts = validarAdjunts(req.body.adjunts);
  } catch (e) {
    return res.status(400).json({ error: (e as Error).message });
  }

  try {
    const resultat = await demanarCanvi(prompt.trim(), brancaDestinacio(), adjunts);
    const proposta = await prisma.propostaIA.create({
      data: {
        prompt: prompt.trim(),
        adjunts: adjunts.map((a) => ({ nom: a.nom, mime: a.mime })) as unknown as Prisma.InputJsonValue,
        resum: resultat.resum,
        missatgeCommit: resultat.missatgeCommit,
        fitxers: resultat.fitxers as unknown as Prisma.InputJsonValue,
        creatPerId: req.usuari!.id,
      },
      select: { ...resum, fitxers: true },
    });
    res.status(201).json(proposta);
  } catch (e) {
    res.status(502).json({ error: `No s'ha pogut generar la proposta: ${(e as Error).message}` });
  }
});

router.post('/:id/aplicar', async (req: AuthRequest, res) => {
  const proposta = await prisma.propostaIA.findUnique({ where: { id: req.params.id } });
  if (!proposta) return res.status(404).json({ error: 'Proposta no trobada' });
  if (proposta.estat !== 'PENDENT') return res.status(400).json({ error: 'Aquesta proposta ja ha estat resolta' });
  if (!repoConfigurat()) return res.status(503).json({ error: "L'accés al repositori no està configurat." });

  try {
    const fitxers = proposta.fitxers as unknown as { path: string; contingut: string }[];
    const commitSha = await aplicarCommit(fitxers, proposta.missatgeCommit, brancaDestinacio());
    const actualitzada = await prisma.propostaIA.update({
      where: { id: proposta.id },
      data: { estat: 'APLICADA', commitSha, aplicatPerId: req.usuari!.id, resoltEl: new Date() },
      select: { ...resum, fitxers: true },
    });
    res.json(actualitzada);
  } catch (e) {
    const actualitzada = await prisma.propostaIA.update({
      where: { id: proposta.id },
      data: { estat: 'ERROR', error: (e as Error).message, aplicatPerId: req.usuari!.id, resoltEl: new Date() },
      select: { ...resum, fitxers: true },
    });
    res.status(502).json(actualitzada);
  }
});

router.post('/:id/rebutjar', async (req: AuthRequest, res) => {
  const proposta = await prisma.propostaIA.findUnique({ where: { id: req.params.id } });
  if (!proposta) return res.status(404).json({ error: 'Proposta no trobada' });
  if (proposta.estat !== 'PENDENT') return res.status(400).json({ error: 'Aquesta proposta ja ha estat resolta' });
  const actualitzada = await prisma.propostaIA.update({
    where: { id: proposta.id },
    data: { estat: 'REBUTJADA', aplicatPerId: req.usuari!.id, resoltEl: new Date() },
    select: { ...resum, fitxers: true },
  });
  res.json(actualitzada);
});

export default router;
