import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'canvia_aquest_secret';

// Registre del primer usuari (nomes funciona si encara no hi ha cap usuari a la base
// de dades). Un cop creat el primer encarregat, aquesta ruta queda tancada per sempre;
// la resta d'usuaris s'han de crear des de /api/usuaris (nomes accessible per encarregats).
router.post('/registre', async (req, res) => {
  const { nom, usuari, contrasenya } = req.body;
  if (!nom || !usuari || !contrasenya) {
    return res.status(400).json({ error: 'Falten camps obligatoris' });
  }
  if (contrasenya.length < 6) {
    return res.status(400).json({ error: 'La contrasenya ha de tenir almenys 6 caràcters' });
  }
  const hiHaUsuaris = (await prisma.usuari.count()) > 0;
  if (hiHaUsuaris) {
    return res.status(403).json({ error: 'El registre obert nomes es pot fer servir per crear el primer usuari. Demana a un encarregat que et creï el compte.' });
  }
  try {
    const contrasenyaHash = await bcrypt.hash(contrasenya, 10);
    const nouUsuari = await prisma.usuari.create({
      data: { nom, usuari: usuari.toLowerCase(), contrasenya: contrasenyaHash, rol: 'ENCARREGAT' },
    });
    res.status(201).json({ id: nouUsuari.id, nom: nouUsuari.nom, usuari: nouUsuari.usuari, rol: nouUsuari.rol });
  } catch (error) {
    res.status(400).json({ error: 'No s\'ha pogut crear l\'usuari (potser el nom d\'usuari ja existeix)' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { usuari, contrasenya } = req.body;
  const trobat = await prisma.usuari.findUnique({ where: { usuari } });
  if (!trobat || !trobat.actiu) {
    return res.status(401).json({ error: 'Credencials incorrectes' });
  }
  const coincideix = await bcrypt.compare(contrasenya, trobat.contrasenya);
  if (!coincideix) {
    return res.status(401).json({ error: 'Credencials incorrectes' });
  }
  const token = jwt.sign({ id: trobat.id, rol: trobat.rol }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, usuari: { id: trobat.id, nom: trobat.nom, usuari: trobat.usuari, rol: trobat.rol } });
});

export default router;
