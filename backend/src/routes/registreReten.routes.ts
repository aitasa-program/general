import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

const includeUsuari = { usuari: { select: { id: true, nom: true } } };

function potModificar(req: AuthRequest, usuariId: string) {
  return req.usuari!.rol === 'ENCARREGAT' || req.usuari!.id === usuariId;
}

function horesEntre(horaInici: Date, horaFi: Date): number {
  return Math.round(((horaFi.getTime() - horaInici.getTime()) / 3600000) * 100) / 100;
}

// Llista de registres: un treballador només veu els seus, un encarregat els veu tots
router.get('/', async (req: AuthRequest, res) => {
  const registres = await prisma.registreReten.findMany({
    where: req.usuari!.rol === 'ENCARREGAT' ? undefined : { usuariId: req.usuari!.id },
    include: includeUsuari,
    orderBy: { data: 'desc' },
  });
  res.json(registres);
});

// Crear un o més registres (sempre a nom de qui els envia)
router.post('/', async (req: AuthRequest, res) => {
  const { tipus, data, horaInici, horaFi, notes } = req.body;
  if (!tipus || !data || !horaInici || !horaFi) {
    return res.status(400).json({ error: 'Cal indicar el tipus, la data i de quina hora a quina hora' });
  }
  const inici = new Date(horaInici);
  const fi = new Date(horaFi);
  if (fi <= inici) {
    return res.status(400).json({ error: "L'hora de fi ha de ser posterior a la d'inici" });
  }
  const registre = await prisma.registreReten.create({
    data: {
      usuariId: req.usuari!.id,
      tipus,
      data: new Date(data),
      horaInici: inici,
      horaFi: fi,
      quantitat: horesEntre(inici, fi),
      notes: notes || undefined,
    },
    include: includeUsuari,
  });
  res.status(201).json(registre);
});

// Editar un registre (el propi autor o un encarregat)
router.patch('/:id', async (req: AuthRequest, res) => {
  const existent = await prisma.registreReten.findUnique({ where: { id: req.params.id } });
  if (!existent) return res.status(404).json({ error: 'Registre no trobat' });
  if (!potModificar(req, existent.usuariId)) {
    return res.status(403).json({ error: 'No pots editar un registre que no és teu' });
  }
  const { tipus, data, horaInici, horaFi, notes } = req.body;
  const inici = horaInici ? new Date(horaInici) : existent.horaInici;
  const fi = horaFi ? new Date(horaFi) : existent.horaFi;
  if (fi <= inici) {
    return res.status(400).json({ error: "L'hora de fi ha de ser posterior a la d'inici" });
  }
  const registre = await prisma.registreReten.update({
    where: { id: req.params.id },
    data: {
      tipus,
      data: data ? new Date(data) : undefined,
      horaInici: inici,
      horaFi: fi,
      quantitat: horesEntre(inici, fi),
      notes: notes === undefined ? undefined : notes || null,
    },
    include: includeUsuari,
  });
  res.json(registre);
});

// Eliminar un registre (el propi autor o un encarregat)
router.delete('/:id', async (req: AuthRequest, res) => {
  const existent = await prisma.registreReten.findUnique({ where: { id: req.params.id } });
  if (!existent) return res.status(404).json({ error: 'Registre no trobat' });
  if (!potModificar(req, existent.usuariId)) {
    return res.status(403).json({ error: 'No pots eliminar un registre que no és teu' });
  }
  await prisma.registreReten.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
