import { Router } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../prisma';
import { requireAuth, requireEncarregat, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);
router.use(requireEncarregat); // tota la gestió d'usuaris és només per a encarregats

const selectPublic = { id: true, nom: true, usuari: true, rol: true, actiu: true, creatEl: true };

// Llistar tots els usuaris
router.get('/', async (_req, res) => {
  const usuaris = await prisma.usuari.findMany({
    select: selectPublic,
    orderBy: { nom: 'asc' },
  });
  res.json(usuaris);
});

// Veure un usuari concret
router.get('/:id', async (req, res) => {
  const usuari = await prisma.usuari.findUnique({
    where: { id: req.params.id },
    select: selectPublic,
  });
  if (!usuari) return res.status(404).json({ error: 'Usuari no trobat' });
  res.json(usuari);
});

// Crear usuari nou
router.post('/', async (req, res) => {
  const { nom, usuari, contrasenya, rol } = req.body;
  if (!nom || !usuari || !contrasenya || !rol) {
    return res.status(400).json({ error: 'Falten camps obligatoris' });
  }
  if (contrasenya.length < 6) {
    return res.status(400).json({ error: 'La contrasenya ha de tenir almenys 6 caràcters' });
  }
  try {
    const contrasenyaHash = await bcrypt.hash(contrasenya, 10);
    const nouUsuari = await prisma.usuari.create({
      data: { nom, usuari: usuari.toLowerCase(), contrasenya: contrasenyaHash, rol },
      select: selectPublic,
    });
    res.status(201).json(nouUsuari);
  } catch {
    res.status(400).json({ error: "No s'ha pogut crear l'usuari (potser el nom d'usuari ja existeix)" });
  }
});

// Editar dades bàsiques d'un usuari (nom, nom d'usuari, rol)
router.patch('/:id', async (req: AuthRequest, res) => {
  const { nom, usuari, rol } = req.body;
  try {
    const actualitzat = await prisma.usuari.update({
      where: { id: req.params.id },
      data: { nom, usuari: usuari ? usuari.toLowerCase() : undefined, rol },
      select: selectPublic,
    });
    res.json(actualitzat);
  } catch {
    res.status(400).json({ error: "No s'ha pogut actualitzar l'usuari" });
  }
});

// Restablir la contrasenya d'un usuari
router.patch('/:id/contrasenya', async (req, res) => {
  const { novaContrasenya } = req.body;
  if (!novaContrasenya || novaContrasenya.length < 6) {
    return res.status(400).json({ error: 'La contrasenya ha de tenir almenys 6 caràcters' });
  }
  const contrasenyaHash = await bcrypt.hash(novaContrasenya, 10);
  await prisma.usuari.update({ where: { id: req.params.id }, data: { contrasenya: contrasenyaHash } });
  res.json({ ok: true });
});

// Desactivar / reactivar un usuari (recomanat en lloc d'eliminar, per mantenir l'historial)
router.patch('/:id/actiu', async (req: AuthRequest, res) => {
  const { actiu } = req.body;
  if (req.params.id === req.usuari!.id && actiu === false) {
    return res.status(400).json({ error: 'No pots desactivar el teu propi usuari' });
  }
  const usuari = await prisma.usuari.update({
    where: { id: req.params.id },
    data: { actiu },
    select: selectPublic,
  });
  res.json(usuari);
});

// Eliminar un usuari definitivament
// Atenció: si té tasques, checklists, moviments d'inventari o respostes associades,
// la base de dades rebutjarà l'eliminació per no trencar l'historial.
// En aquest cas, cal desactivar l'usuari en lloc d'eliminar-lo.
router.delete('/:id', async (req: AuthRequest, res) => {
  if (req.params.id === req.usuari!.id) {
    return res.status(400).json({ error: 'No pots eliminar el teu propi usuari' });
  }
  try {
    await prisma.usuari.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(409).json({
      error: "No es pot eliminar: aquest usuari té tasques, checklists o moviments associats. Desactiva'l en lloc d'eliminar-lo.",
    });
  }
});

export default router;
