import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, requireEncarregat, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

// --- Tipus de producte (grups) ---

router.get('/tipus', async (_req, res) => {
  const tipus = await prisma.tipusProducte.findMany({ orderBy: { nom: 'asc' } });
  res.json(tipus);
});

router.post('/tipus', requireEncarregat, async (req, res) => {
  const { nom } = req.body;
  if (!nom) return res.status(400).json({ error: 'Cal indicar un nom pel tipus' });
  try {
    const tipus = await prisma.tipusProducte.create({ data: { nom } });
    res.status(201).json(tipus);
  } catch {
    res.status(400).json({ error: 'No s\'ha pogut crear el tipus (potser ja existeix)' });
  }
});

// --- Productes ---

router.get('/productes', async (_req, res) => {
  const productes = await prisma.producte.findMany({
    include: { tipus: true },
    orderBy: { nom: 'asc' },
  });
  res.json(productes);
});

// El codi intern es genera automàticament: l'encarregat ja no l'ha d'introduir a mà.
function generarCodi(): string {
  return `PROD-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

router.post('/productes', requireEncarregat, async (req, res) => {
  const { nom, tipusId, quantitat, ubicacio, estanteria, stockMinim } = req.body;
  const producte = await prisma.producte.create({
    data: {
      nom,
      codi: generarCodi(),
      tipusId: tipusId || null,
      quantitat: quantitat ?? 0,
      ubicacio: ubicacio || null,
      estanteria: estanteria === '' || estanteria === undefined ? null : Number(estanteria),
      stockMinim: stockMinim ?? 0,
    },
    include: { tipus: true },
  });
  res.status(201).json(producte);
});

// --- Moviments d'inventari (entrades/sortides) ---

// Qualsevol usuari pot registrar un moviment, però queda PENDENT
router.post('/moviments', async (req: AuthRequest, res) => {
  const { producteId, tipus, quantitat } = req.body;
  const moviment = await prisma.movimentInventari.create({
    data: {
      producteId,
      tipus,
      quantitat,
      usuariRegistraId: req.usuari!.id,
      estat: 'PENDENT',
    },
  });
  res.status(201).json(moviment);
});

// Llista moviments pendents de confirmar (només encarregats)
router.get('/moviments/pendents', requireEncarregat, async (_req, res) => {
  const pendents = await prisma.movimentInventari.findMany({
    where: { estat: 'PENDENT' },
    include: { producte: true, usuariRegistra: { select: { id: true, nom: true } } },
    orderBy: { dataRegistre: 'asc' },
  });
  res.json(pendents);
});

// Confirmar o rebutjar un moviment (només encarregats)
router.patch('/moviments/:id/confirmar', requireEncarregat, async (req: AuthRequest, res) => {
  const { aprovat } = req.body; // true = confirmar, false = rebutjar

  const moviment = await prisma.movimentInventari.findUnique({ where: { id: req.params.id } });
  if (!moviment) return res.status(404).json({ error: 'Moviment no trobat' });
  if (moviment.estat !== 'PENDENT') {
    return res.status(400).json({ error: 'Aquest moviment ja ha estat revisat' });
  }

  // Transacció: actualitza l'estat del moviment i, si es confirma, l'stock del producte
  const resultat = await prisma.$transaction(async (tx) => {
    const actualitzat = await tx.movimentInventari.update({
      where: { id: req.params.id },
      data: {
        estat: aprovat ? 'CONFIRMAT' : 'REBUTJAT',
        confirmatPerId: req.usuari!.id,
        dataConfirmacio: new Date(),
      },
    });

    if (aprovat) {
      const delta = moviment.tipus === 'ENTRADA' ? moviment.quantitat : -moviment.quantitat;
      await tx.producte.update({
        where: { id: moviment.producteId },
        data: { quantitat: { increment: delta } },
      });
    }

    return actualitzat;
  });

  res.json(resultat);
});

export default router;
