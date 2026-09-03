import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, requireEncarregat, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

const includeUsuari = { usuari: { select: { id: true, nom: true } } };

// Sessió oberta (fitxada) de l'usuari actual, si n'hi ha
router.get('/actual', async (req: AuthRequest, res) => {
  const obert = await prisma.fitxatge.findFirst({
    where: { usuariId: req.usuari!.id, sortida: null },
    orderBy: { entrada: 'desc' },
  });
  res.json(obert);
});

// Llista de fitxatges: un treballador només veu els seus, un encarregat els veu tots
router.get('/', async (req: AuthRequest, res) => {
  const fitxatges = await prisma.fitxatge.findMany({
    where: req.usuari!.rol === 'ENCARREGAT' ? undefined : { usuariId: req.usuari!.id },
    include: includeUsuari,
    orderBy: { entrada: 'desc' },
    take: 200,
  });
  res.json(fitxatges);
});

// Fitxar entrada
router.post('/entrada', async (req: AuthRequest, res) => {
  const obert = await prisma.fitxatge.findFirst({ where: { usuariId: req.usuari!.id, sortida: null } });
  if (obert) return res.status(400).json({ error: 'Ja tens una entrada fitxada sense sortida' });
  const fitxatge = await prisma.fitxatge.create({
    data: { usuariId: req.usuari!.id, entrada: new Date() },
    include: includeUsuari,
  });
  res.status(201).json(fitxatge);
});

// Fitxar sortida (tanca la darrera entrada oberta)
router.post('/sortida', async (req: AuthRequest, res) => {
  const obert = await prisma.fitxatge.findFirst({
    where: { usuariId: req.usuari!.id, sortida: null },
    orderBy: { entrada: 'desc' },
  });
  if (!obert) return res.status(400).json({ error: 'No tens cap entrada fitxada' });
  const fitxatge = await prisma.fitxatge.update({
    where: { id: obert.id },
    data: { sortida: new Date() },
    include: includeUsuari,
  });
  res.json(fitxatge);
});

// Editar un fitxatge (per corregir un oblit), només encarregats
router.patch('/:id', requireEncarregat, async (req, res) => {
  const { entrada, sortida } = req.body;
  try {
    const fitxatge = await prisma.fitxatge.update({
      where: { id: req.params.id },
      data: {
        entrada: entrada ? new Date(entrada) : undefined,
        sortida: sortida === null ? null : sortida ? new Date(sortida) : undefined,
      },
      include: includeUsuari,
    });
    res.json(fitxatge);
  } catch {
    res.status(400).json({ error: "No s'ha pogut actualitzar el fitxatge" });
  }
});

// Eliminar un fitxatge, només encarregats
router.delete('/:id', requireEncarregat, async (req, res) => {
  await prisma.fitxatge.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
