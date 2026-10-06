import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { requireAuth, requireEncarregat, AuthRequest } from '../middleware/auth.middleware';
import { demanarCanvi, iaConfigurada } from '../services/iaAgent.service';
import { aplicarCommit, brancaDestinacio, repoConfigurat } from '../services/githubRepo.service';

const router = Router();
router.use(requireAuth, requireEncarregat);

const resum = {
  id: true, prompt: true, resum: true, missatgeCommit: true, estat: true, error: true, commitSha: true,
  creatPer: { select: { id: true, nom: true } }, aplicatPer: { select: { id: true, nom: true } },
  creatEl: true, resoltEl: true,
} as const;

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

  try {
    const resultat = await demanarCanvi(prompt.trim(), brancaDestinacio());
    const proposta = await prisma.propostaIA.create({
      data: {
        prompt: prompt.trim(),
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
