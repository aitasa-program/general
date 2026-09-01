import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, requireEncarregat, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

// El reté canvia cada dilluns a les 8:00. Donada una data, retorna el dilluns
// a les 8:00 que marca l'inici de la setmana de reté a la qual pertany.
function inicioSetmanaReten(data: Date): Date {
  const d = new Date(data);
  const diaSetmana = d.getDay(); // 0=diumenge, 1=dilluns, ..., 6=dissabte
  const diesDesDeDilluns = (diaSetmana + 6) % 7;
  const dilluns = new Date(d);
  dilluns.setHours(0, 0, 0, 0);
  dilluns.setDate(d.getDate() - diesDesDeDilluns);
  dilluns.setHours(8, 0, 0, 0);
  if (dilluns.getTime() > d.getTime()) {
    dilluns.setDate(dilluns.getDate() - 7);
  }
  return dilluns;
}

// Reté d'aquesta setmana (accessible a tots els usuaris, per mostrar al Dashboard)
router.get('/actual', async (_req, res) => {
  const inici = inicioSetmanaReten(new Date());
  const reten = await prisma.reten.findUnique({
    where: { setmanaInici: inici },
    include: { usuari: true },
  });
  res.json({ setmanaInici: inici, usuari: reten?.usuari || null });
});

// Llista totes les assignacions de reté (només encarregats)
router.get('/', requireEncarregat, async (_req, res) => {
  const retens = await prisma.reten.findMany({
    include: { usuari: true },
    orderBy: { setmanaInici: 'asc' },
  });
  res.json(retens);
});

// Assignar (o reassignar) el reté per la setmana a la qual pertany la data indicada
router.post('/', requireEncarregat, async (req: AuthRequest, res) => {
  const { data, usuariId } = req.body;
  if (!data || !usuariId) {
    return res.status(400).json({ error: 'Cal indicar una data i un usuari' });
  }
  const inici = inicioSetmanaReten(new Date(data));
  const reten = await prisma.reten.upsert({
    where: { setmanaInici: inici },
    update: { usuariId },
    create: { setmanaInici: inici, usuariId },
    include: { usuari: true },
  });
  res.status(201).json(reten);
});

// Eliminar una assignació de reté (només encarregats)
router.delete('/:id', requireEncarregat, async (req, res) => {
  await prisma.reten.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
