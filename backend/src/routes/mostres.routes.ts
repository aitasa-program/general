import { Router } from 'express';
import { createHash } from 'crypto';
import { z } from 'zod';
import { prisma } from '../prisma';
import { requireAuth, requireEncarregat } from '../middleware/auth.middleware';
import { compteActiu, endpoint } from './arxiu.utils';

const router = Router();
router.use(requireAuth, compteActiu);
const schema = z.object({
  grup: z.string().trim().min(1).max(80), titol: z.string().trim().min(1).max(250),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(d => !isNaN(Date.parse(d)) && new Date(d).toISOString().slice(0,10) === d),
  notes: z.string().max(20000).default(''), intervalDies: z.union([z.literal(0), z.literal(7), z.literal(14)]).default(0),
});
function clau(d: {grup:string;titol:string;data:string;intervalDies:number}) {
  return createHash('sha256').update(JSON.stringify([d.grup,d.titol].map(s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim()).concat([d.data,String(d.intervalDies)]))).digest('hex');
}
router.get('/', endpoint(async (_req,res) => res.json(await prisma.mostra.findMany({orderBy:[{data:'asc'},{grup:'asc'},{titol:'asc'}]}))));
router.post('/', requireEncarregat, endpoint(async (req,res) => {
  const data=schema.parse(req.body);
  res.status(201).json(await prisma.mostra.create({data:{...data,clau:clau(data)}}));
}));
router.patch('/:id', requireEncarregat, endpoint(async (req,res) => {
  const data=schema.parse(req.body);
  if(!await prisma.mostra.findUnique({where:{id:req.params.id}}))return res.status(404).json({error:'Mostra no trobada'});
  res.json(await prisma.mostra.update({where:{id:req.params.id},data:{...data,clau:clau(data)}}));
}));
router.patch('/:id/estat', requireEncarregat, endpoint(async(req,res)=>{
  const data=z.object({feta:z.boolean()}).parse(req.body);
  const original=await prisma.mostra.findUnique({where:{id:req.params.id}});
  if(!original)return res.status(404).json({error:'Mostra no trobada'});
  const result=await prisma.$transaction(async tx=>{
    const updated=await tx.mostra.update({where:{id:original.id},data});
    if(data.feta&&original.intervalDies){
      const date=new Date(original.data+'T12:00:00Z'); date.setUTCDate(date.getUTCDate()+original.intervalDies);
      const next={grup:original.grup,titol:original.titol,data:date.toISOString().slice(0,10),notes:original.notes,intervalDies:original.intervalDies};
      const key=clau(next);
      await tx.mostra.upsert({where:{clau:key},create:{...next,clau:key},update:{}});
    }
    return updated;
  });
  res.json(result);
}));
export default router;
