import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth, requireEncarregat, AuthRequest } from '../middleware/auth.middleware';
import { usuariIdDelRetenActual } from '../services/reten.service';
import { usuariIdDeLaQuinzenaActual } from '../services/quinzena.service';
import { usuariIdDeLaQuinzenaBActual } from '../services/quinzenaB.service';
import { inicioSetmana } from '../services/setmana.util';

const router = Router();
router.use(requireAuth);

const includeUsuaris = {
  assignatsA: { select: { id: true, nom: true } },
  creatPer: { select: { id: true, nom: true } },
};

type UsuariMinim = { id: string; nom: string };

// Qui toca de retén/quinzena en cada setmana concreta (per la data límit pròpia de
// cada tasca), no només avui. Si la tasca no té data límit, no hi ha cap setmana
// a resoldre i es fa servir el retén/quinzena d'avui com a únic referent.
async function mapaPerSetmana(taula: 'reten' | 'quinzena' | 'quinzenaB'): Promise<Map<number, UsuariMinim>> {
  const files =
    taula === 'reten'
      ? await prisma.reten.findMany({ select: { setmanaInici: true, usuari: { select: { id: true, nom: true } } } })
      : taula === 'quinzena'
      ? await prisma.quinzena.findMany({ select: { setmanaInici: true, usuari: { select: { id: true, nom: true } } } })
      : await prisma.quinzenaB.findMany({ select: { setmanaInici: true, usuari: { select: { id: true, nom: true } } } });
  return new Map(files.map((f) => [f.setmanaInici.getTime(), f.usuari]));
}

router.get('/', async (req: AuthRequest, res) => {
  const [totes, mapaReten, mapaQuinzena, mapaQuinzenaB] = await Promise.all([
    prisma.tasca.findMany({ include: includeUsuaris, orderBy: { creatEl: 'desc' } }),
    mapaPerSetmana('reten'),
    mapaPerSetmana('quinzena'),
    mapaPerSetmana('quinzenaB'),
  ]);

  const enriquides = totes.map((t) => {
    const setmana = (t.dataLimit ? inicioSetmana(t.dataLimit) : inicioSetmana(new Date())).getTime();
    const retenResolt = t.assignatAlReten ? mapaReten.get(setmana) || null : null;
    const quinzenaResolt = t.assignatAQuinzena ? mapaQuinzena.get(setmana) || null : null;
    const quinzenaBResolt = t.assignatAQuinzenaB ? mapaQuinzenaB.get(setmana) || null : null;
    return { ...t, retenResolt, quinzenaResolt, quinzenaBResolt };
  });

  if (req.usuari!.rol === 'ENCARREGAT') {
    return res.json(enriquides);
  }

  const meves = enriquides.filter(
    (t) =>
      t.assignatsA.some((u) => u.id === req.usuari!.id) ||
      (t.assignatAlReten && t.retenResolt?.id === req.usuari!.id) ||
      (t.assignatAQuinzena && t.quinzenaResolt?.id === req.usuari!.id) ||
      (t.assignatAQuinzenaB && t.quinzenaBResolt?.id === req.usuari!.id)
  );
  res.json(meves);
});

// Crear tasca (només encarregats) — es pot assignar a un o més usuaris, i/o al retén/quinzena
router.post('/', requireEncarregat, async (req: AuthRequest, res) => {
  const { titol, descripcio, assignatsAIds, assignatAlReten, assignatAQuinzena, assignatAQuinzenaB, dataLimit, prioritat, repeticio } = req.body;
  const ids: string[] = Array.isArray(assignatsAIds) ? assignatsAIds : [];
  if (ids.length === 0 && !assignatAlReten && !assignatAQuinzena && !assignatAQuinzenaB) {
    return res.status(400).json({ error: 'Cal assignar la tasca a algú, al retén o a una quinzena' });
  }
  const tasca = await prisma.tasca.create({
    data: {
      titol,
      descripcio,
      assignatsA: { connect: ids.map((id) => ({ id })) },
      assignatAlReten: !!assignatAlReten,
      assignatAQuinzena: !!assignatAQuinzena,
      assignatAQuinzenaB: !!assignatAQuinzenaB,
      creatPerId: req.usuari!.id,
      dataLimit,
      prioritat,
      repeticio: repeticio || 'UNIC',
    },
    include: includeUsuaris,
  });
  res.status(201).json(tasca);
});

// Canviar estat d'una tasca (un dels assignats, el retén/quinzena si li pertoca, o un encarregat)
router.patch('/:id/estat', async (req: AuthRequest, res) => {
  const { estat } = req.body;
  const tasca = await prisma.tasca.findUnique({
    where: { id: req.params.id },
    include: { assignatsA: { select: { id: true } } },
  });
  if (!tasca) return res.status(404).json({ error: 'Tasca no trobada' });
  const esAssignat = tasca.assignatsA.some((u) => u.id === req.usuari!.id);

  let potPerReten = false;
  if (tasca.assignatAlReten) {
    if (tasca.dataLimit) {
      const mapaReten = await mapaPerSetmana('reten');
      potPerReten = mapaReten.get(inicioSetmana(tasca.dataLimit).getTime())?.id === req.usuari!.id;
    } else {
      potPerReten = (await usuariIdDelRetenActual()) === req.usuari!.id;
    }
  }
  let potPerQuinzena = false;
  if (tasca.assignatAQuinzena) {
    if (tasca.dataLimit) {
      const mapaQuinzena = await mapaPerSetmana('quinzena');
      potPerQuinzena = mapaQuinzena.get(inicioSetmana(tasca.dataLimit).getTime())?.id === req.usuari!.id;
    } else {
      potPerQuinzena = (await usuariIdDeLaQuinzenaActual()) === req.usuari!.id;
    }
  }
  let potPerQuinzenaB = false;
  if (tasca.assignatAQuinzenaB) {
    if (tasca.dataLimit) {
      const mapaQuinzenaB = await mapaPerSetmana('quinzenaB');
      potPerQuinzenaB = mapaQuinzenaB.get(inicioSetmana(tasca.dataLimit).getTime())?.id === req.usuari!.id;
    } else {
      potPerQuinzenaB = (await usuariIdDeLaQuinzenaBActual()) === req.usuari!.id;
    }
  }

  if (req.usuari!.rol === 'TREBALLADOR' && !esAssignat && !potPerReten && !potPerQuinzena && !potPerQuinzenaB) {
    return res.status(403).json({ error: 'No pots modificar una tasca que no és teva' });
  }
  const actualitzada = await prisma.tasca.update({
    where: { id: req.params.id },
    data: { estat },
    include: includeUsuaris,
  });
  res.json(actualitzada);
});

export default router;
