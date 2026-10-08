import { Router } from 'express';
import { createHash } from 'crypto';
import { z } from 'zod';
import { prisma } from '../prisma';
import { requireAuth, requireEncarregat } from '../middleware/auth.middleware';
import { compteActiu, endpoint } from './arxiu.utils';
import { inicioSetmana } from '../services/setmana.util';

const router = Router();
router.use(requireAuth, compteActiu);
const schema = z.object({
  grup: z.string().trim().min(1).max(80), titol: z.string().trim().min(1).max(250),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(d => !isNaN(Date.parse(d)) && new Date(d).toISOString().slice(0,10) === d),
  ubicacio: z.string().trim().max(250).default(''),
  notes: z.string().max(20000).default(''), intervalDies: z.union([z.literal(0), z.literal(7), z.literal(14)]).default(0),
  // Assignaci\u00f3 manual de qui la fa. Si no se'n posa cap i el grup no \u00e9s "EPN"/"EPS", es fa
  // servir qui estigui de ret\u00e9n la setmana d'aquesta data.
  usuariAssignatId: z.string().uuid().nullable().optional(),
});
function clau(d: {grup:string;titol:string;data:string;intervalDies:number}) {
  return createHash('sha256').update(JSON.stringify([d.grup,d.titol].map(s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim()).concat([d.data,String(d.intervalDies)]))).digest('hex');
}
const includeAssignat = { usuariAssignat: { select: { id: true, nom: true } } } as const;
// Aquests grups no s'assignen automàticament a qui estigui de retén: els gestionen els
// encarregats directament (assignació manual des de l'editor de la mostra).
const SENSE_RETEN_AUTOMATIC = new Set(['EPN', 'EPS']);

async function ambResponsable<T extends { grup: string; data: string; usuariAssignat: { id: string; nom: string } | null }>(mostres: T[]) {
  const retens = await prisma.reten.findMany({ select: { setmanaInici: true, usuari: { select: { id: true, nom: true } } } });
  const perSetmana = new Map(retens.map(r => [r.setmanaInici.toISOString().slice(0, 10), r.usuari]));
  return mostres.map(m => {
    let responsable = m.usuariAssignat;
    if (!responsable && !SENSE_RETEN_AUTOMATIC.has(m.grup)) {
      const setmana = inicioSetmana(new Date(m.data + 'T12:00:00Z')).toISOString().slice(0, 10);
      responsable = perSetmana.get(setmana) || null;
    }
    return { ...m, responsable };
  });
}

router.get('/', endpoint(async (_req, res) => {
  const mostres = await prisma.mostra.findMany({ orderBy: [{ data: 'asc' }, { grup: 'asc' }, { titol: 'asc' }], include: includeAssignat });
  res.json(await ambResponsable(mostres));
}));
router.post('/', requireEncarregat, endpoint(async (req,res) => {
  const data=schema.parse(req.body);
  const creada = await prisma.mostra.create({data:{...data,clau:clau(data)}, include: includeAssignat});
  res.status(201).json((await ambResponsable([creada]))[0]);
}));
router.patch('/:id', requireEncarregat, endpoint(async (req,res) => {
  const data=schema.parse(req.body);
  if(!await prisma.mostra.findUnique({where:{id:req.params.id}}))return res.status(404).json({error:'Mostra no trobada'});
  const actualitzada = await prisma.mostra.update({where:{id:req.params.id},data:{...data,clau:clau(data)}, include: includeAssignat});
  res.json((await ambResponsable([actualitzada]))[0]);
}));
router.patch('/:id/estat', requireEncarregat, endpoint(async(req,res)=>{
  const data=z.object({feta:z.boolean()}).parse(req.body);
  const original=await prisma.mostra.findUnique({where:{id:req.params.id}});
  if(!original)return res.status(404).json({error:'Mostra no trobada'});
  const result=await prisma.$transaction(async tx=>{
    const updated=await tx.mostra.update({where:{id:original.id},data, include: includeAssignat});
    if(data.feta&&original.intervalDies){
      const date=new Date(original.data+'T12:00:00Z'); date.setUTCDate(date.getUTCDate()+original.intervalDies);
      const next={grup:original.grup,titol:original.titol,data:date.toISOString().slice(0,10),ubicacio:original.ubicacio,notes:original.notes,intervalDies:original.intervalDies,usuariAssignatId:original.usuariAssignatId};
      const key=clau(next);
      await tx.mostra.upsert({where:{clau:key},create:{...next,clau:key},update:{}});
    }
    return updated;
  });
  res.json((await ambResponsable([result]))[0]);
}));
export default router;
