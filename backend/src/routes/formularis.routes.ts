import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, requireEncarregat, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

// Llista de formularis disponibles (plantilles)
router.get('/', async (_req, res) => {
  const formularis = await prisma.formulari.findMany({ orderBy: { creatEl: 'desc' } });
  res.json(formularis);
});

// Crear un formulari nou (només encarregats defineixen l'estructura)
// camps: [{ nom: string, tipus: 'text'|'numero'|'seleccio', opcions?: string[] }]
router.post('/', requireEncarregat, async (req: AuthRequest, res) => {
  const { nom, camps } = req.body;
  const formulari = await prisma.formulari.create({ data: { nom, camps } });
  res.status(201).json(formulari);
});

// Enviar una resposta a un formulari (qualsevol usuari)
router.post('/:id/respostes', async (req: AuthRequest, res) => {
  const { valors } = req.body;
  const resposta = await prisma.respostaFormulari.create({
    data: { formulariId: req.params.id, usuariId: req.usuari!.id, valors },
  });
  res.status(201).json(resposta);
});

// Veure respostes d'un formulari (només encarregats)
router.get('/:id/respostes', requireEncarregat, async (req, res) => {
  const respostes = await prisma.respostaFormulari.findMany({
    where: { formulariId: req.params.id },
    include: { usuari: true },
    orderBy: { dataEl: 'desc' },
  });
  res.json(respostes);
});

export default router;
