import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, requireEncarregat } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);
router.use(requireEncarregat); // gestió de la flota, només per a encarregats

// Llistar tots els vehicles
router.get('/', async (_req, res) => {
  const vehicles = await prisma.vehicle.findMany({ orderBy: { matricula: 'asc' } });
  res.json(vehicles);
});

// Crear un vehicle nou
router.post('/', async (req, res) => {
  const { matricula, marca, model, propietat, empresaRenting, proximaItv, proximaRevisio, notes } = req.body;
  if (!matricula || !propietat) {
    return res.status(400).json({ error: 'Cal indicar la matrícula i si és propi o de renting' });
  }
  try {
    const vehicle = await prisma.vehicle.create({
      data: {
        matricula,
        marca: marca || undefined,
        model: model || undefined,
        propietat,
        empresaRenting: empresaRenting || undefined,
        proximaItv: proximaItv ? new Date(proximaItv) : undefined,
        proximaRevisio: proximaRevisio ? new Date(proximaRevisio) : undefined,
        notes: notes || undefined,
      },
    });
    res.status(201).json(vehicle);
  } catch {
    res.status(400).json({ error: 'No s\'ha pogut crear el vehicle (potser la matrícula ja existeix)' });
  }
});

// Editar un vehicle
router.patch('/:id', async (req, res) => {
  const { matricula, marca, model, propietat, empresaRenting, proximaItv, proximaRevisio, notes } = req.body;
  try {
    const vehicle = await prisma.vehicle.update({
      where: { id: req.params.id },
      data: {
        matricula,
        marca: marca || null,
        model: model || null,
        propietat,
        empresaRenting: empresaRenting || null,
        proximaItv: proximaItv ? new Date(proximaItv) : null,
        proximaRevisio: proximaRevisio ? new Date(proximaRevisio) : null,
        notes: notes || null,
      },
    });
    res.json(vehicle);
  } catch {
    res.status(400).json({ error: "No s'ha pogut actualitzar el vehicle" });
  }
});

// Eliminar un vehicle
router.delete('/:id', async (req, res) => {
  await prisma.vehicle.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
