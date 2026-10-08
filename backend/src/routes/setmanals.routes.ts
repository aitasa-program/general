import { Router } from 'express';
import { z } from 'zod';
import { createHash, randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { requireEncarregat, AuthRequest } from '../middleware/auth.middleware';
import { endpoint, enviarFitxer } from './arxiu.utils';
import { diaSchema, validarLogoPdf } from '../services/control.validation';
import { dadesBuides, prepararSetmana, dilluns, DadesSetmanals, ModelSetmanal, modelSetmanalInputSchema, construirOrganoleptics } from '../services/setmanals.models';
import { generarSetmanalPdf } from '../services/setmanalsPdf.service';

const router = Router(); // Mounted after requireAuth and compteActiu in controls.routes.
const resum = { id:true, versio:true, autorNom:true, creatEl:true, motiu:true, sha256:true } as const;
const hash = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');

// Conversió interna: conserva els bytes del logo i els altres camps de personalització
// del PDF tal qual, perquè generarSetmanalPdf els pugui fer servir.
function comModel(m: { id: string; nom: string; titol: string; instruccions: string; llocs: unknown; grups: unknown; organoleptics: unknown; notaOrg: string; notaAnomalies: string; bespoke: boolean; activa: boolean; pdfLogoDades: Buffer | Uint8Array | null; pdfLogoMime: string | null; pdfColorPrimari: string | null; pdfPeuText: string | null; pdfInfoAddicional: string | null }): ModelSetmanal {
  return { ...m, llocs: m.llocs as string[], grups: m.grups as ModelSetmanal['grups'], organoleptics: m.organoleptics as ModelSetmanal['organoleptics'] };
}
// Forma pública per a l'API: no envia mai els bytes del logo, només si n'hi ha un.
function modelPublic(m: ModelSetmanal) {
  const { pdfLogoDades, pdfLogoMime, pdfColorPrimari, pdfPeuText, pdfInfoAddicional, ...rest } = m;
  return { ...rest, tePdfLogo: !!pdfLogoMime, pdfColorPrimari: pdfColorPrimari || '', pdfPeuText: pdfPeuText || '', pdfInfoAddicional: pdfInfoAddicional || '' };
}

router.get('/models', endpoint(async (req, res) => {
  const models = await prisma.modelSetmanal.findMany({ where: req.usuari!.rol === 'ENCARREGAT' ? {} : { activa: true }, orderBy: { nom: 'asc' } });
  res.json(models.map(comModel).map(modelPublic));
}));

router.get('/models/:id/pdf-logo', endpoint(async (req, res) => {
  const m = await prisma.modelSetmanal.findUnique({ where: { id: req.params.id }, select: { pdfLogoDades: true, pdfLogoMime: true } });
  if (!m?.pdfLogoDades) return res.status(404).json({ error: 'Aquest control setmanal no té logo propi' });
  res.setHeader('Content-Type', m.pdfLogoMime || 'image/png');
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.send(m.pdfLogoDades);
}));

// Crear un control setmanal nou (només encarregats). Els 4 originals ("bespoke")
// no es creen mai per aquí; només els que defineix un encarregat des de l'editor.
router.post('/models', requireEncarregat, endpoint(async (req, res) => {
  const body = modelSetmanalInputSchema.parse(req.body);
  let logo;
  try { logo = validarLogoPdf(body.pdfLogoBase64, body.pdfLogoNomFitxer); } catch (e) { return res.status(400).json({ error: (e as Error).message }); }
  const creat = await prisma.modelSetmanal.create({
    data: {
      id: randomUUID(),
      nom: body.nom, titol: body.titol, instruccions: body.instruccions,
      llocs: body.llocs as Prisma.InputJsonValue, grups: body.grups as unknown as Prisma.InputJsonValue, organoleptics: (body.ambOrganoleptics ? construirOrganoleptics(body.autoPerLloc) : []) as unknown as Prisma.InputJsonValue,
      notaOrg: body.notaOrg, notaAnomalies: body.notaAnomalies, bespoke: false, activa: true,
      ...logo, pdfColorPrimari: body.pdfColorPrimari || null, pdfPeuText: body.pdfPeuText || null, pdfInfoAddicional: body.pdfInfoAddicional || null,
    },
  });
  res.status(201).json(modelPublic(comModel(creat)));
}));

// Editar un control setmanal (nom, títol, grups, llocs...), inclosos els 4 originals.
router.patch('/models/:id', requireEncarregat, endpoint(async (req, res) => {
  const existent = await prisma.modelSetmanal.findUnique({ where: { id: req.params.id } });
  if (!existent) return res.status(404).json({ error: 'Control setmanal no trobat' });
  const body = modelSetmanalInputSchema.extend({ activa: z.boolean().default(true) }).parse(req.body);
  let logo;
  try { logo = validarLogoPdf(body.pdfLogoBase64, body.pdfLogoNomFitxer); } catch (e) { return res.status(400).json({ error: (e as Error).message }); }
  const actualitzat = await prisma.modelSetmanal.update({
    where: { id: req.params.id },
    data: {
      nom: body.nom, titol: body.titol, instruccions: body.instruccions,
      llocs: body.llocs as Prisma.InputJsonValue, grups: body.grups as unknown as Prisma.InputJsonValue, organoleptics: (body.ambOrganoleptics ? construirOrganoleptics(body.autoPerLloc) : []) as unknown as Prisma.InputJsonValue,
      notaOrg: body.notaOrg, notaAnomalies: body.notaAnomalies, activa: body.activa,
      ...(logo ? logo : body.pdfTreureLogo ? { pdfLogoDades: null, pdfLogoMime: null } : {}),
      ...(body.pdfColorPrimari !== undefined ? { pdfColorPrimari: body.pdfColorPrimari || null } : {}),
      ...(body.pdfPeuText !== undefined ? { pdfPeuText: body.pdfPeuText || null } : {}),
      ...(body.pdfInfoAddicional !== undefined ? { pdfInfoAddicional: body.pdfInfoAddicional || null } : {}),
    },
  });
  res.json(modelPublic(comModel(actualitzat)));
}));

const paramsSchema = z.object({ tipus: z.string().min(1).max(60), setmana: diaSchema.refine(d => dilluns(d) === d, 'Selecciona el dilluns de la setmana') });
router.get('/pdf/:id', endpoint(async (req, res) => {
  const r = await prisma.revisioControlSetmanal.findUnique({where:{id:req.params.id},include:{full:true}});
  if(!r) return res.status(404).json({error:'Versió no trobada'});
  enviarFitxer(res, r.pdf, 'application/pdf', `${r.full.tipus}-${r.full.setmana}-v${r.versio}.pdf`);
}));
router.get('/:tipus/:setmana', endpoint(async (req, res) => {
  const key=paramsSchema.parse(req.params);
  const pagina=z.coerce.number().int().min(1).max(100000).default(1).parse(req.query.pagina);
  const full=await prisma.fullControlSetmanal.findUnique({where:{tipus_setmana:key}});
  if(!full) return res.json({versio:0,dades:dadesBuides(key.setmana),historial:[],pagina,total:0,revisionId:null});
  const [latest,historial]=await Promise.all([
    prisma.revisioControlSetmanal.findUnique({where:{fullId_versio:{fullId:full.id,versio:full.versio}},select:{id:true,dades:true}}),
    prisma.revisioControlSetmanal.findMany({where:{fullId:full.id},select:resum,orderBy:{versio:'desc'},take:20,skip:(pagina-1)*20}),
  ]);
  res.json({versio:full.versio,dades:latest!.dades,historial,pagina,total:full.versio,revisionId:latest!.id});
}));
router.post('/:tipus/:setmana', endpoint(async (req: AuthRequest, res) => {
  const key=paramsSchema.parse(req.params);
  const body=z.object({id:z.string().uuid(),versio:z.number().int().min(0),dades:z.unknown(),motiu:z.string().trim().max(1000).optional()}).parse(req.body);
  const peticioHash=hash(JSON.stringify({key,body,autorId:req.usuari!.id}));
  const prior=await prisma.revisioControlSetmanal.findUnique({where:{id:body.id},select:{...resum,peticioHash:true}});
  if(prior){if(prior.peticioHash!==peticioHash)return res.status(409).json({error:'Aquesta petició ja es va desar. Consulta la versió guardada.'});return res.json({id:prior.id,versio:prior.versio});}
  const modelRow=await prisma.modelSetmanal.findUnique({where:{id:key.tipus}});
  if(!modelRow||!modelRow.activa) return res.status(404).json({error:'Control setmanal no trobat o arxivat'});
  const model=comModel(modelRow);
  const full=await prisma.fullControlSetmanal.findUnique({where:{tipus_setmana:key},include:{revisions:{orderBy:{versio:'desc'},take:1,select:{dades:true}}}});
  if((full?.versio||0)!==body.versio)return res.status(409).json({error:'Una altra persona ha actualitzat el full. Recarrega’l abans de continuar.'});
  const autor=await prisma.usuari.findUniqueOrThrow({where:{id:req.usuari!.id},select:{nom:true}});
  let prepared;
  try{prepared=prepararSetmana(model,key.setmana,body.dades,full ? full.revisions[0].dades as unknown as DadesSetmanals : dadesBuides(key.setmana),autor.nom);}
  catch(e){return res.status(400).json({error:e instanceof z.ZodError ? 'Revisa les dates i els valors del formulari' : (e as Error).message});}
  if(prepared.correccio&&!body.motiu)return res.status(400).json({error:'Indica el motiu de la correcció de les dades ja guardades.'});
  const meta={id:body.id,versio:body.versio+1,autorNom:autor.nom,creatEl:new Date(),motiu:body.motiu};
  const pdf=await generarSetmanalPdf(model,key.setmana,prepared.dades,meta);
  try{
    const result=await prisma.$transaction(async tx=>{
      const head=await tx.fullControlSetmanal.upsert({where:{tipus_setmana:key},create:key,update:{}});
      const changed=await tx.fullControlSetmanal.updateMany({where:{id:head.id,versio:body.versio},data:{versio:{increment:1}}});
      if(!changed.count)throw new Error('CONFLICT');
      return tx.revisioControlSetmanal.create({data:{...meta,fullId:head.id,autorId:req.usuari!.id,dades:prepared.dades,pdf,sha256:hash(pdf),peticioHash},select:resum});
    });
    res.status(201).json(result);
  }catch(e){if((e as Error).message==='CONFLICT')return res.status(409).json({error:'El full ha canviat. Recarrega’l per no sobreescriure les dades d’una altra persona.'});throw e;}
}));
export default router;
