import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, requireEncarregat, AuthRequest } from '../middleware/auth.middleware';
import { inicioSetmana } from '../services/setmana.util';

const router = Router();
router.use(requireAuth);

// Llista de formularis disponibles (plantilles)
router.get('/', async (req: AuthRequest, res) => {
  const setmanaActual = inicioSetmana(new Date());
  const [formularis, retens] = await Promise.all([
    prisma.formulari.findMany({ orderBy: { creatEl: 'desc' } }),
    prisma.reten.findMany({
      where: { setmanaInici: { lte: setmanaActual } },
      select: { setmanaInici: true, usuariId: true },
      orderBy: { setmanaInici: 'asc' },
    }),
  ]);
  const setmanes = retens.map((r) => r.setmanaInici);
  const respostesReten = formularis.length && setmanes.length
    ? await prisma.respostaFormulari.findMany({
        where: { formulariId: { in: formularis.map((f) => f.id) }, setmanaReten: { in: setmanes } },
        select: { formulariId: true, setmanaReten: true },
      })
    : [];
  const potVeurePendents = req.usuari!.rol === 'ENCARREGAT' || retens.some((r) =>
    r.setmanaInici.getTime() === setmanaActual.getTime() && r.usuariId === req.usuari!.id
  );
  res.json(formularis.map((formulari) => ({
    ...formulari,
    setmanesRetenPendents: potVeurePendents ? retens
      .filter((reten) => reten.setmanaInici >= formulari.retenObligatoriDesDe)
      .filter((reten) => !respostesReten.some((resposta) =>
        resposta.formulariId === formulari.id && resposta.setmanaReten?.getTime() === reten.setmanaInici.getTime()
      ))
      .map((reten) => reten.setmanaInici) : [],
  })));
});

// Crear un formulari nou (només encarregats defineixen l'estructura)
// camps: [{ nom: string, tipus: 'text'|'numero'|'seleccio', opcions?: string[] }]
router.post('/', requireEncarregat, async (req: AuthRequest, res) => {
  const { nom, camps } = req.body;
  const formulari = await prisma.formulari.create({ data: { nom, camps, retenObligatoriDesDe: inicioSetmana(new Date()) } });
  res.status(201).json(formulari);
});

// Enviar una resposta a un formulari (qualsevol usuari)
router.post('/:id/respostes', async (req: AuthRequest, res) => {
  const { valors, setmanaReten: setmanaRaw } = req.body;
  let resposta;
  if (setmanaRaw) {
    const setmanaReten = new Date(setmanaRaw);
    const setmanaNormalitzada = inicioSetmana(setmanaReten);
    if (Number.isNaN(setmanaReten.getTime()) || setmanaReten.getTime() !== setmanaNormalitzada.getTime()) {
      return res.status(400).json({ error: 'La setmana de RETÉN no és vàlida' });
    }
    const [formulari, retenActual, retenSetmana] = await Promise.all([
      prisma.formulari.findUnique({ where: { id: req.params.id } }),
      prisma.reten.findUnique({ where: { setmanaInici: inicioSetmana(new Date()) } }),
      prisma.reten.findUnique({ where: { setmanaInici: setmanaReten } }),
    ]);
    if (!formulari) return res.status(404).json({ error: 'Formulari no trobat' });
    if (!retenActual || retenActual.usuariId !== req.usuari!.id) {
      return res.status(403).json({ error: 'Només el RETÉN actual pot completar aquest formulari' });
    }
    if (!retenSetmana || setmanaReten < formulari.retenObligatoriDesDe || setmanaReten > inicioSetmana(new Date())) {
      return res.status(400).json({ error: 'Aquesta setmana no té cap formulari pendent de RETÉN' });
    }
    const existent = await prisma.respostaFormulari.findFirst({
      where: { formulariId: formulari.id, setmanaReten },
      select: { id: true },
    });
    if (existent) return res.status(409).json({ error: 'Aquest formulari ja consta com a completat aquella setmana' });
    resposta = await prisma.respostaFormulari.create({
      data: { formulariId: formulari.id, usuariId: req.usuari!.id, valors, setmanaReten },
    });
  } else {
    resposta = await prisma.respostaFormulari.create({
      data: { formulariId: req.params.id, usuariId: req.usuari!.id, valors },
    });
  }
  res.status(201).json(resposta);
});

// Veure respostes d'un formulari (només encarregats)
router.get('/:id/respostes', requireEncarregat, async (req, res) => {
  const respostes = await prisma.respostaFormulari.findMany({
    where: { formulariId: req.params.id },
    include: { usuari: { select: { id: true, nom: true } } },
    orderBy: { dataEl: 'desc' },
  });
  res.json(respostes);
});

export default router;
