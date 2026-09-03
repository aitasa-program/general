import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

const includeUsuari = { usuari: { select: { id: true, nom: true } } };

function potModificar(req: AuthRequest, usuariId: string) {
  return req.usuari!.rol === 'ENCARREGAT' || req.usuari!.id === usuariId;
}

// Llista de fitxatges: un treballador només veu els seus, un encarregat els veu tots
router.get('/', async (req: AuthRequest, res) => {
  const fitxatges = await prisma.fitxatge.findMany({
    where: req.usuari!.rol === 'ENCARREGAT' ? undefined : { usuariId: req.usuari!.id },
    include: includeUsuari,
    orderBy: { entrada: 'desc' },
  });
  res.json(fitxatges);
});

// Apuntar una jornada (o tram) treballada, amb lloc i què s'ha fet
router.post('/', async (req: AuthRequest, res) => {
  const { entrada, sortida, lloc, descripcio } = req.body;
  if (!entrada || !sortida || !lloc) {
    return res.status(400).json({ error: "Cal indicar l'hora d'entrada, la de sortida i el lloc de treball" });
  }
  const fitxatge = await prisma.fitxatge.create({
    data: {
      usuariId: req.usuari!.id,
      entrada: new Date(entrada),
      sortida: new Date(sortida),
      lloc,
      descripcio: descripcio || undefined,
    },
    include: includeUsuari,
  });
  res.status(201).json(fitxatge);
});

// Editar un fitxatge (el propi autor o un encarregat)
router.patch('/:id', async (req: AuthRequest, res) => {
  const existent = await prisma.fitxatge.findUnique({ where: { id: req.params.id } });
  if (!existent) return res.status(404).json({ error: 'Fitxatge no trobat' });
  if (!potModificar(req, existent.usuariId)) {
    return res.status(403).json({ error: 'No pots editar un fitxatge que no és teu' });
  }
  const { entrada, sortida, lloc, descripcio } = req.body;
  try {
    const fitxatge = await prisma.fitxatge.update({
      where: { id: req.params.id },
      data: {
        entrada: entrada ? new Date(entrada) : undefined,
        sortida: sortida ? new Date(sortida) : undefined,
        lloc,
        descripcio: descripcio === undefined ? undefined : descripcio || null,
      },
      include: includeUsuari,
    });
    res.json(fitxatge);
  } catch {
    res.status(400).json({ error: "No s'ha pogut actualitzar el fitxatge" });
  }
});

// Eliminar un fitxatge (el propi autor o un encarregat)
router.delete('/:id', async (req: AuthRequest, res) => {
  const existent = await prisma.fitxatge.findUnique({ where: { id: req.params.id } });
  if (!existent) return res.status(404).json({ error: 'Fitxatge no trobat' });
  if (!potModificar(req, existent.usuariId)) {
    return res.status(403).json({ error: 'No pots eliminar un fitxatge que no és teu' });
  }
  await prisma.fitxatge.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
